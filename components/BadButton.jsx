"use client"

import { faThumbsDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import styles from './NiceBadButton.module.css'

function BadButton({ onClick }) {
  return (
    <div>
        <button className={styles.Down} onClick={onClick}><FontAwesomeIcon icon={ faThumbsDown } /></button>
    </div>
  )
}

export default BadButton