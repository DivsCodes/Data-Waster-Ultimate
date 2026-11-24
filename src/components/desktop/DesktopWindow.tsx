import { useRef } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';
import type { ReactNode, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { DesktopAppId, DesktopBounds, DesktopWindowState, WindowRect } from '../../features/desktop-os/desktopState';
import type { LucideIcon } from 'lucide-react';

interface DesktopWindowProps {
  windowState: DesktopWindowState;
  title: string;
  icon: LucideIcon;
  bounds: DesktopBounds;
  focused: boolean;
  children: ReactNode;
  onFocus: (id: DesktopAppId) => void;
  onClose: (id: DesktopAppId) => void;
  onMinimize: (id: DesktopAppId) => void;
  onToggleMaximize: (id: DesktopAppId) => void;
  onMove: (id: DesktopAppId, rect: WindowRect) => void;
  onResize: (id: DesktopAppId, rect: WindowRect) => void;
}

export function DesktopWindow({
  windowState,
  title,
  icon: Icon,
  bounds,
  focused,
  children,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onResize,
}: DesktopWindowProps) {
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const resizeRef = useRef<{ pointerId: number; startX: number; startY: number; width: number; height: number } | null>(null);

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (windowState.maximized || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: windowState.x,
      y: windowState.y,
    };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const width = windowState.width;
    const height = windowState.height;
    const maxX = Math.max(8, bounds.width - width - 8);
    const maxY = Math.max(8, bounds.height - height - 8);
    onMove(windowState.id, {
      x: Math.min(maxX, Math.max(8, drag.x + event.clientX - drag.startX)),
      y: Math.min(maxY, Math.max(8, drag.y + event.clientY - drag.startY)),
      width,
      height,
    });
  };

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (windowState.maximized) return;
    event.preventDefault();
    event.stopPropagation();
    onFocus(windowState.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: windowState.width,
      height: windowState.height,
    };
  };

  const moveResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const maxWidth = Math.max(240, bounds.width - windowState.x - 8);
    const maxHeight = Math.max(190, bounds.height - windowState.y - 8);
    onResize(windowState.id, {
      x: windowState.x,
      y: windowState.y,
      width: Math.min(maxWidth, Math.max(240, resize.width + event.clientX - resize.startX)),
      height: Math.min(maxHeight, Math.max(190, resize.height + event.clientY - resize.startY)),
    });
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };
  const finishResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
  };

  if (windowState.minimized) return null;

  return (
    <section
      className={`dw-window${focused ? ' dw-window--focused' : ''}${windowState.maximized ? ' dw-window--maximized' : ''}`}
      style={{ left: windowState.x, top: windowState.y, width: windowState.width, height: windowState.height, zIndex: windowState.zIndex }}
      role="dialog"
      aria-label={`${title} window`}
      onPointerDown={() => onFocus(windowState.id)}
    >
      <div
        className="dw-window__titlebar"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onDoubleClick={(event: ReactMouseEvent<HTMLDivElement>) => { if (!(event.target as HTMLElement).closest('button')) onToggleMaximize(windowState.id); }}
      >
        <div className="dw-window__title">
          <span className="dw-window__app-icon"><Icon size={14} /></span>
          <strong>{title}</strong>
          <small>DATA WASTER OS</small>
        </div>
        <div className="dw-window__controls" onPointerDown={(event) => { event.stopPropagation(); onFocus(windowState.id); }}>
          <button type="button" aria-label={`Minimize ${title}`} title="Minimize" onClick={() => onMinimize(windowState.id)}><Minus size={13} /></button>
          <button type="button" aria-label={`${windowState.maximized ? 'Restore' : 'Maximize'} ${title}`} title={windowState.maximized ? 'Restore' : 'Maximize'} onClick={() => onToggleMaximize(windowState.id)}><Maximize2 size={12} /></button>
          <button type="button" aria-label={`Close ${title}`} title="Close" onClick={() => onClose(windowState.id)}><X size={13} /></button>
        </div>
      </div>
      <div className="dw-window__content">{children}</div>
      {!windowState.maximized && (
        <button
          className="dw-window__resize"
          type="button"
          aria-label={`Resize ${title} window`}
          onPointerDown={beginResize}
          onPointerMove={moveResize}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
        ><Minimize2 size={11} /></button>
      )}
    </section>
  );
}
