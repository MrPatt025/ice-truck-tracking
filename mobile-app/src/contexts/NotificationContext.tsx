import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  ReactNode,
} from 'react'
import * as Notifications from 'expo-notifications'
import * as Linking from 'expo-linking'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

interface NotificationContextType {
  requestPermissions: () => Promise<boolean>
  scheduleNotification: (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
)

type NotificationProviderProps = Readonly<{ children: ReactNode }>

export function NotificationProvider({ children }: NotificationProviderProps) {
  useEffect(() => {
    // Handle notification responses
    const subscription = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined

        // Handle deep linking based on notification data
        if (typeof data?.screen === 'string') {
          // Navigate to specific screen
          console.log('Navigate to:', data.screen)
        }
      }
    )

    // Handle deep links
    const handleDeepLink = (url: string) => {
      const { path, queryParams } = Linking.parse(url)
      console.log('Deep link:', path, queryParams)
    }

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url)
    })

    return () => {
      subscription.remove()
      linkingSubscription.remove()
    }
  }, [])

  const requestPermissions = async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  }

  const scheduleNotification = async (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Show immediately
    })
  }

  const value = useMemo<NotificationContextType>(
    () => ({
      requestPermissions,
      scheduleNotification,
    }),
    []
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    )
  }
  return context
}
