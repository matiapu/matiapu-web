"use client"
import React from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import styles from './NiceBadButton.module.css'


function NiceButton() {
  return (
    <div>
        <button className={styles.Up}><FontAwesomeIcon icon={ faThumbsUp } /></button>
    </div>
  )
}

export default NiceButton