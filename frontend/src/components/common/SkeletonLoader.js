import React from 'react';
import styles from './SkeletonLoader.module.css';

const SkeletonLoader = ({ type = 'card', count = 1, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`${styles.skeletonCard} ${className}`}>
            <div className={styles.skeletonHeader}>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonBadge}></div>
            </div>
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLineShort}></div>
            </div>
            <div className={styles.skeletonFooter}>
              <div className={styles.skeletonButton}></div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className={`${styles.skeletonTable} ${className}`}>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className={styles.skeletonRow}>
                <div className={styles.skeletonCell}></div>
                <div className={styles.skeletonCell}></div>
                <div className={styles.skeletonCell}></div>
                <div className={styles.skeletonCell}></div>
              </div>
            ))}
          </div>
        );

      case 'detail':
        return (
          <div className={`${styles.skeletonDetail} ${className}`}>
            <div className={styles.skeletonHeader}>
              <div className={styles.skeletonTitle}></div>
              <div className={styles.skeletonMeta}></div>
            </div>
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonSection}></div>
              <div className={styles.skeletonSection}></div>
              <div className={styles.skeletonSection}></div>
            </div>
          </div>
        );

      case 'workflow':
        return (
          <div className={`${styles.skeletonWorkflow} ${className}`}>
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className={styles.skeletonStep}>
                <div className={styles.skeletonCircle}></div>
                <div className={styles.skeletonStepContent}>
                  <div className={styles.skeletonLine}></div>
                  <div className={styles.skeletonLineShort}></div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return <div className={`${styles.skeletonLine} ${className}`}></div>;
    }
  };

  if (count > 1 && type !== 'table') {
    return (
      <div className={styles.skeletonContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>{renderSkeleton()}</div>
        ))}
      </div>
    );
  }

  return renderSkeleton();
};

export default SkeletonLoader;