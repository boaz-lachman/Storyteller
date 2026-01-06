import NetInfo from '@react-native-community/netinfo';

export const isOnline = async (): Promise<boolean> => {
    const netInfo = await NetInfo.fetch();
    return Boolean(netInfo.isConnected && netInfo.isInternetReachable);
  }