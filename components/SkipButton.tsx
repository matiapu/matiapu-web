"use client";

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faForward } from '@fortawesome/free-solid-svg-icons';
import styles from './NiceBadButton.module.css';

interface SkipButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

function SkipButton({ onClick }: SkipButtonProps) {
  return (
    <div>
      <button 
        className={styles.Skip} 
        onClick={onClick}
        aria-label="スキップ"
      >
        <FontAwesomeIcon icon={faForward} />
      </button>
    </div>
  );
}

export default SkipButton;
