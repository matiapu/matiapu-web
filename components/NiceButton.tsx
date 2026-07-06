"use client"
import React from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import styles from './NiceBadButton.module.css'

interface NiceButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  isLiked?: boolean;
}

function NiceButton({ onClick, isLiked = false }: NiceButtonProps) {
  return (
    <div>
        <button 
          className={`${styles.Up} ${isLiked ? styles.liked : ''}`} 
          onClick={onClick}
          aria-label="いいね"
        >
          <FontAwesomeIcon icon={ faThumbsUp } />
        </button>
    </div>
  )
}

export default NiceButton