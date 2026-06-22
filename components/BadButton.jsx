"use client"

import { faThumbsDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import styles from './NiceBadButton.module.css'

function BadButton() {
  return (
    <div>
        <button className={styles.Down}><FontAwesomeIcon icon={ faThumbsDown } /></button>
    </div>
  )
}

export default BadButton