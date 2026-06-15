import styles from "./UserIcon.module.css";
import Image from "next/image";

export default function UserIcon({ iconUrl, userName = "ユーザー" }) {
  return (
    <div className={styles.userIcon}>
      <Image
        src={iconUrl || '/user_icon/user_icon1.jpg'}
        alt={`${userName}のアイコン`}
        fill
        sizes="64px"
        className={styles.iconImage}
      />
    </div>
  );
}

//


//モックデータ表示例

// import UserIcon from "@/components/UserIcon";

// const mockUser = {
//   name: "テストユーザー",
//   iconUrl: "/user-icon.png",
// };

// export default function Page() {
//   return (
//     <div>
//       <UserIcon iconUrl={mockUser.iconUrl} userName={mockUser.name} />
//     </div>
//   );
// }