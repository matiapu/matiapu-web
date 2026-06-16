import React from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { faThumbsDown } from '@fortawesome/free-solid-svg-icons';
import styles from './NiceBadButton.module.css'


function NiceBadButton({ onPrevious, onNext, disablePrevious, disableNext }) {
  return (
    <div>
        <div className={styles.Button_wrapper}>
          <button
              type="button"
              className={styles.Up}
              onClick={onNext}
              disabled={disableNext}
              aria-label="次の投稿を表示"
            >
              <FontAwesomeIcon icon={ faThumbsUp } />
            </button>
            <button
              type="button"
              className={styles.Down}
              onClick={onPrevious}
              disabled={disablePrevious}
              aria-label="前の投稿を表示"
            >
              <FontAwesomeIcon icon={ faThumbsDown } />
            </button>
        </div>
    </div>
  )
}

export default NiceBadButton