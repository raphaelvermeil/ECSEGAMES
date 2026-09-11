package cscomp

import (
	"context"
	"encoding/base64"
	"time"

	"github.com/chromedp/cdproto/emulation"
	"github.com/chromedp/cdproto/network"
	"github.com/chromedp/chromedp"
)

// The challenge canvas. Both the seeder's target images and every
// submission are rendered at exactly this size, at device scale factor 1 —
// the mock's iframe dimensions. (Its on-screen `transform: scale(1.5)` is
// cosmetic and must not be reproduced here: a target rendered at a
// different size than the submissions would never match.)
const (
	canvasWidth  = 300
	canvasHeight = 200
)

// renderTimeout bounds a single screenshot. A page that hangs takes its
// tab down with it rather than the browser.
const renderTimeout = 10 * time.Second

// blockEverything blocks every request that has a scheme and a host — so,
// every request that could leave the process. The data: URL the page
// itself is navigated to has no "://" and so does not match, which is the
// point: the markup renders, but nothing it references ever loads.
var blockEverything = []*network.BlockPattern{{URLPattern: "*://*:*/*", Block: true}}

// Renderer rasterizes untrusted HTML in headless Chrome. One browser
// process is started once and shared; each render gets its own tab, which
// is always closed.
//
// Everything about this type is about containing the markup it runs. It is
// attacker-controlled input executing in a real browser inside our
// network, so:
//
//   - All network requests are blocked, twice over: Chrome is started with
//     a resolver rule that fails every hostname, and each tab additionally
//     blocks every URL pattern. Without this an <img src> or @import
//     pointed at a cloud metadata endpoint or an internal service is a
//     live SSRF, and an exfiltration channel for whatever the page can
//     read. This is not optional.
//   - JavaScript is disabled. The challenges are pure CSS, so nothing is
//     lost, and it is the server-side equivalent of the mock's sandbox="".
//   - Chrome's own sandbox stays on: --no-sandbox is deliberately absent.
//     Run the service as a non-root user. If a deployment target forces
//     the flag (some containers do), that has to be a conscious decision.
//   - Submissions are capped at MaxCodeBytes before they get here.
//   - A semaphore bounds concurrent tabs so a submit storm cannot fork-bomb
//     the host.
type Renderer struct {
	allocCtx context.Context
	cancel   context.CancelFunc
	sem      chan struct{}
}

// NewRenderer starts the shared browser. chromePath may be empty, in which
// case chromedp locates Chrome itself; concurrency <= 0 falls back to 4.
//
// A failure here is not fatal to the server: main logs it and mounts the
// module with a nil Renderer, so reads, teams and claims keep working
// while submissions return 503.
func NewRenderer(chromePath string, concurrency int) (*Renderer, error) {
	if concurrency <= 0 {
		concurrency = 4
	}

	opts := append([]chromedp.ExecAllocatorOption{},
		chromedp.NoFirstRun,
		chromedp.NoDefaultBrowserCheck,
		chromedp.Flag("headless", "new"),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("disable-extensions", true),
		chromedp.Flag("disable-background-networking", true),
		// Second layer under the per-tab URL block: nothing the page asks
		// for ever resolves to an address in the first place.
		chromedp.Flag("host-resolver-rules", "MAP * ~NOTFOUND"),
	)
	if chromePath != "" {
		opts = append(opts, chromedp.ExecPath(chromePath))
	}

	allocCtx, cancelAlloc := chromedp.NewExecAllocator(context.Background(), opts...)

	// Starting the allocator is lazy, so force a real browser launch now:
	// a missing or broken Chrome should be reported at boot, not on the
	// first student's submission.
	probeCtx, cancelProbe := chromedp.NewContext(allocCtx)
	defer cancelProbe()
	runCtx, cancelRun := context.WithTimeout(probeCtx, renderTimeout)
	defer cancelRun()
	if err := chromedp.Run(runCtx); err != nil {
		cancelAlloc()
		return nil, err
	}

	return &Renderer{
		allocCtx: allocCtx,
		cancel:   cancelAlloc,
		sem:      make(chan struct{}, concurrency),
	}, nil
}

// Close shuts the shared browser down.
func (rd *Renderer) Close() { rd.cancel() }

// Render loads html in an isolated tab and returns a PNG of the
// canvasWidth x canvasHeight viewport. The page is navigated as a data:
// URL so it has no origin to reach anything from, and it is given no
// network and no scripting.
func (rd *Renderer) Render(ctx context.Context, html string) ([]byte, error) {
	select {
	case rd.sem <- struct{}{}:
		defer func() { <-rd.sem }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	tabCtx, cancelTab := chromedp.NewContext(rd.allocCtx)
	defer cancelTab()
	runCtx, cancelRun := context.WithTimeout(tabCtx, renderTimeout)
	defer cancelRun()

	url := "data:text/html;base64," + base64.StdEncoding.EncodeToString([]byte(html))

	var buf []byte
	err := chromedp.Run(runCtx,
		network.Enable(),
		network.SetBlockedURLs().WithURLPatterns(blockEverything),
		emulation.SetScriptExecutionDisabled(true),
		chromedp.EmulateViewport(canvasWidth, canvasHeight),
		chromedp.Navigate(url),
		chromedp.CaptureScreenshot(&buf),
	)
	if err != nil {
		return nil, err
	}
	return buf, nil
}
