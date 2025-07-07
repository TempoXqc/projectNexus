import React, { memo, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOutsideClick?: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  height?: string;
}

function Modal({
                 isOpen,
                 onClose,
                 onOutsideClick,
                 title,
                 children,
                 width = '600px',
                 height = 'auto',
               }: ModalProps) {
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const modal = document.querySelector('.modal-content');
      if (isOpen && modal && !modal.contains(e.target as Node) && onOutsideClick) {
        onOutsideClick();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onOutsideClick]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        className="modal-content relative bg-gray-800 rounded-lg shadow-lg p-6"
        style={{ width, maxHeight: '90vh', overflowY: 'auto', height }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white hover:text-gray-800"
        >
          <X />
        </button>
        {title && <h2 className="text-xl text-white font-bold mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export default memo(Modal);