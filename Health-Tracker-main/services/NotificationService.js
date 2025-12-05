import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. Cấu hình handler hiển thị thông báo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Trên iOS mới: dùng banner + list
    shouldShowAlert: true,      // vẫn giữ cho tương thích
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Hàm xin quyền (Chạy 1 lần trước khi đặt lịch)
export async function registerForPushNotificationsAsync() {
  // Android: tạo channel với rung lâu hơn
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Health Reminder',
      importance: Notifications.AndroidImportance.MAX,
      // Rung mạnh & dài hơn: 0ms delay, rung 800, nghỉ 400, rung 800, nghỉ 400, rung 800
      vibrationPattern: [0, 800, 400, 800, 400, 800],
      lightColor: '#FF231F7C',
    });
  }

  // Xin quyền trên cả máy thật & máy ảo
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Người dùng từ chối quyền thông báo!');
    return false;
  }

  return true;
}

// Hàm helper: tạo title + body rõ ràng
function buildNotificationContent(item: any, triggerDate: Date) {
  const timeLabel = triggerDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateLabel = triggerDate.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

  let title = 'Nhắc nhở sức khỏe';
  let body = '';

  if (item.type === 'exercise') {
    title = '🏃‍♂️ Đến giờ tập luyện!';
    body =
      `Đã đến giờ tập: ${item.name}.\n` +
      `Thời gian: ${timeLabel} (${dateLabel}).\n` +
      `Hãy chuẩn bị không gian và khởi động nhẹ trước khi tập nhé.`;
  } else {
    title = '🍽️ Đến giờ ăn uống!';
    body =
      `Đã đến giờ cho bữa: ${item.name}.\n` +
      `Thời gian: ${timeLabel} (${dateLabel}).\n` +
      `Ăn chậm, nhai kỹ và uống đủ nước để tốt cho tiêu hoá.`;
  }

  return { title, body };
}

// 3. Hàm lên lịch (Core Logic)
export async function scheduleWeeklyPlan(planItems: any[]) {
  // BƯỚC 1: Hủy tất cả thông báo cũ để tránh trùng lặp
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('Đã hủy lịch cũ. Đang đặt lịch mới...');

  // BƯỚC 2: Duyệt qua từng item
  for (const item of planItems) {
    // item.date: "2025-12-04"
    // item.notify_time: "07:00:00"
    const timeString = `${item.date}T${item.notify_time}`; // "2025-12-04T07:00:00"
    const triggerDate = new Date(timeString);
    const now = new Date();

    // Chỉ đặt thông báo nếu thời gian đó chưa qua
    if (triggerDate > now) {
      const { title, body } = buildNotificationContent(item, triggerDate);

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default', // rõ ràng dùng sound default
          // priority chỉ áp dụng Android
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        // Quan trọng: dùng trực tiếp Date để schedule đúng giờ
        trigger: triggerDate,
      });

      console.log(
        `Đã đặt lịch: ${item.name} (${item.type}) vào lúc ${triggerDate.toLocaleString()}`
      );
    }
  }
}
