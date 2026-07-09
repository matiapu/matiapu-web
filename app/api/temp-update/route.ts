import { NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/src/firebase/firebase";

export async function GET() {
  try {
    const userRef = doc(db, "users", "JgXQBJrpxbRhVQLlDwpyISPJuA62");
    
    const updates = {
      userType: "politician",
      politicalParty: "未来かがやき党",
      pledge: "戸塚区の安全・安心な街づくり、防災体制の強化と地域コミュニティの活性化に全力で取り組みます。すべての世代が健やかに安心して暮らせる街「横浜」の実現を目指し、皆様の声に寄り添い活動します。",
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(userRef, updates);
    
    return NextResponse.json({
      success: true,
      message: "Successfully updated user JgXQBJrpxbRhVQLlDwpyISPJuA62 to a sample politician account.",
      updatedFields: updates
    });
  } catch (error) {
    console.error("Error updating user:", error);
    const errMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errMessage
    }, { status: 500 });
  }
}
