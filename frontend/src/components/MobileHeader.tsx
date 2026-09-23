"use client";

import { useState } from "react";
import MobileChromeBar from "@/components/MobileChromeBar";
import MobileNavMenu from "@/components/MobileNavMenu";

// Mobile-only header with no title band: just the shared chrome bar and the
// nav drawer. For pages whose own content already opens with a full-bleed
// banner (the landing hero), where PageBanner's green title strip
// would stack a second one on top.
export default function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <MobileChromeBar
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((o) => !o)}
      />
      <MobileNavMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
