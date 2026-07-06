"use client"

import { faThumbsDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import styles from './NiceBadButton.module.css'

interface BadButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  isDisliked?: boolean;
}

function BadButton({ onClick, isDisliked = false }: BadButtonProps) {
  return (
    <div>
        <button 
          className={`${styles.Down} ${isDisliked ? styles.disliked : ''}`} 
          onClick={onClick}
          aria-label="いまいち"
        >
          <FontAwesomeIcon icon={ faThumbsDown } />
        </button>
    </div>
  )
}

export default BadButton