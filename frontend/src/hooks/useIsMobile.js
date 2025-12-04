import { useEffect, useState } from 'react';

/**
 * Hook kiểm tra thiết bị mobile
 * @param {number} breakpoint - Điểm ngắt chiều rộng (mặc định 768)
 * @returns {boolean} - True nếu là mobile
 */
// Trả về true nếu chiều rộng cửa sổ nhỏ hơn 768px (điểm ngắt mobile)
export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < breakpoint);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}
