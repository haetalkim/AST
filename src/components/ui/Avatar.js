import React from 'react';
import defaultAvatar from '../../assets/default-avatar.png';

/**
 * Default profile picture. No photo upload exists yet, so every avatar in
 * the app today is a placeholder — use the exact default-avatar asset
 * (rather than approximating it with an icon+background) for pixel-accurate
 * results.
 */
const SIZE_CLASSES = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-22 h-22',
};

const Avatar = ({ size = 'md', className = '', style }) => (
  <img
    src={defaultAvatar}
    alt=""
    className={[
      'rounded-full object-cover shrink-0 bg-gray-100',
      SIZE_CLASSES[size] || SIZE_CLASSES.md,
      className,
    ].join(' ')}
    style={style}
  />
);

export default Avatar;
