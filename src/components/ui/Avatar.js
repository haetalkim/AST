import React from 'react';
import { User } from 'lucide-react';

/**
 * Generic default profile picture (no photo upload exists yet, so every
 * avatar in the app is a "default" avatar): a neutral gray circle with a
 * solid person silhouette, matching the standard default-pfp convention
 * instead of colored initials.
 */
const SIZE_CLASSES = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-22 h-22',
};

const Avatar = ({ size = 'md', className = '', style }) => (
  <div
    className={[
      'rounded-full flex items-center justify-center bg-gray-400 shrink-0 overflow-hidden',
      SIZE_CLASSES[size] || SIZE_CLASSES.md,
      className,
    ].join(' ')}
    style={style}
  >
    <User className="text-gray-50 w-[62%] h-[62%]" fill="currentColor" strokeWidth={0} aria-hidden="true" />
  </div>
);

export default Avatar;
