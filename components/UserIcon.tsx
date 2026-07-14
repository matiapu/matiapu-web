import styles from "./UserIcon.module.css";
import Image from "next/image";

interface UserIconProps {
  iconUrl?: string | null;
  userName?: string;
  className?: string;
  priority?: boolean;
}

export default function UserIcon({ iconUrl, userName = "ユーザー", className, priority = false }: UserIconProps) {
  return (
    <div className={`${styles.userIcon} ${className || ""}`}>
      <Image
        src={iconUrl || '/user_Icon/user_icon1.jpg'}
        alt={`${userName}のアイコン`}
        fill
        sizes="300px"
        className={styles.iconImage}
        unoptimized
        priority={priority}
      />
    </div>
  );
}