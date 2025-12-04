import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// 1. Cấu hình: Khi app đang mở, thông báo đến vẫn hiện popup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Hàm xin quyền (Chạy 1 lần khi mở app)
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // Nếu chưa có quyền thì xin
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
  return false;
}

// 3. Hàm lên lịch (Core Logic)
export async function scheduleWeeklyPlan(planItems) {
  // BƯỚC 1: Hủy tất cả thông báo cũ để tránh trùng lặp
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("Đã hủy lịch cũ. Đang đặt lịch mới...");

  // BƯỚC 2: Duyệt qua từng item lấy từ Django
  for (const item of planItems) {
    // item.date: "2025-12-04"
    // item.notify_time: "07:00:00"
    
    // Tạo đối tượng Date chuẩn
    const timeString = `${item.date}T${item.notify_time}`; // "2025-12-04T07:00:00"
    const triggerDate = new Date(timeString);
    const now = new Date();

    // Chỉ đặt thông báo nếu thời gian đó chưa qua
    if (triggerDate > now) {
        
      let title = "Nhắc nhở sức khỏe apple";
      let body = `Đến giờ cho: ${item.name}`;
      
      if(item.type === 'exercise') {
          title = "🏃‍♂️ Đến giờ tập luyện!";
          body = `Bài tập: ${item.name} đang chờ bạn.`;
      } else {
          title = "🍽️ Đến giờ ăn!";
          body = `Món ăn: ${item.name} cho bữa ${item.type}.`;
      }

      // Đặt lịch với Hệ điều hành
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: true,
        },
        trigger: {
          date: triggerDate, // Quan trọng: Đây là lúc nó sẽ kêu
        },
      });
      
      console.log(`Đã đặt lịch: ${item.name} vào lúc ${triggerDate.toLocaleString()}`);
    }
  }
}