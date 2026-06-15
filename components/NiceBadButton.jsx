import React from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { faThumbsDown } from '@fortawesome/free-solid-svg-icons';
import styles from './NiceBadButton.module.css'


function NiceBadButton() {
  return (
    <div>
        <div className={styles.Button_wrapper}>
            <button className={styles.Down}><FontAwesomeIcon icon={ faThumbsDown } /></button>
            <button className={styles.Up}><FontAwesomeIcon icon={ faThumbsUp } /></button>
        </div>
    </div>
  )
}

export default NiceBadButton