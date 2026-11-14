'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';

export function ClubSidebarShell({
  brand,
  children,
}: {
  brand: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const drawerId = useId();
  const [open, setOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const pendingFocusRef = useRef<'close' | 'search' | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onOpenSearch = () => {
      pendingFocusRef.current = 'search';
      setOpen(true);
    };
    const onCloseDrawer = () => setOpen(false);

    window.addEventListener('sam:open-club-search', onOpenSearch);
    window.addEventListener('sam:close-club-drawer', onCloseDrawer);
    return () => {
      window.removeEventListener('sam:open-club-search', onOpenSearch);
      window.removeEventListener('sam:close-club-drawer', onCloseDrawer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const focusTarget = pendingFocusRef.current;
    pendingFocusRef.current = null;
    if (focusTarget === 'search') {
      window.requestAnimationFrame(() => {
        sidebarRef.current?.querySelector<HTMLInputElement>('.club-search-input')?.focus();
      });
    } else if (focusTarget === 'close') {
      window.requestAnimationFrame(() => {
        closeBtnRef.current?.focus();
      });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        window.requestAnimationFrame(() => menuBtnRef.current?.focus());
      }
    };
    const prevOverflow = document.body.style.overflow;
    if (window.innerWidth <= 840) {
      document.body.style.overflow = 'hidden';
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function handleOpenDrawer(focusTarget: 'close' | 'search' = 'close') {
    pendingFocusRef.current = focusTarget;
    setOpen(true);
  }

  function handleCloseDrawer() {
    setOpen(false);
    window.requestAnimationFrame(() => menuBtnRef.current?.focus());
  }

  return (
    <>
      <div className="mobile-topbar">
        <div className="mobile-topbar-brand">{brand}</div>
        <div className="mobile-topbar-actions">
          <button
            type="button"
            className="button subtle mobile-icon-btn"
            aria-label="جست‌وجوی سریع"
            onClick={() => handleOpenDrawer('search')}
          >
            <Search size={18} aria-hidden="true" />
            <span>جست‌وجو</span>
          </button>
          <button
            ref={menuBtnRef}
            type="button"
            className="button primary mobile-menu-btn"
            aria-expanded={open}
            aria-controls={drawerId}
            aria-label={open ? 'بستن منوی مدیریت' : 'باز کردن منوی مدیریت'}
            onClick={() => (open ? handleCloseDrawer() : handleOpenDrawer('close'))}
          >
            <Menu size={18} aria-hidden="true" />
            <span>منو</span>
          </button>
        </div>
      </div>

      {open && (
        <div
          className="mobile-drawer-backdrop"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        id={drawerId}
        className={open ? 'local-sidebar is-open' : 'local-sidebar'}
        aria-label="منوی مدیریت باشگاه"
      >
        <div className="local-sidebar-head">
          {brand}
          <button
            ref={closeBtnRef}
            type="button"
            className="button subtle mobile-close-btn"
            aria-label="بستن منو"
            onClick={handleCloseDrawer}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}
