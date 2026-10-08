import React, { useState, useRef, useEffect } from 'react';

export default function HoverDropdown({
  trigger,
  children,
  className = '',
  dropdownClassName = '',
  align = 'right',
  closeDelay = 180,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  };

  const handleClickToggle = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen]);

  const alignmentClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div onClick={handleClickToggle} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute top-full ${alignmentClass} pt-1 z-50`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={`bg-paper rounded border border-rule shadow-sm overflow-hidden ${dropdownClassName}`}
          >
            {typeof children === 'function' ? children({ close: () => setIsOpen(false) }) : children}
          </div>
        </div>
      )}
    </div>
  );
}

export { HoverDropdown };
