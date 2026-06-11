import styles from "./UserIcon.module.css";

export default function UserIcon({ iconUrl, userName = "ユーザー" }) {
  return (
    <div className={styles.userIcon}>
      <img
        src={iconUrl || "/default-user-icon.png"}
        alt={`${userName}のアイコン`}
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