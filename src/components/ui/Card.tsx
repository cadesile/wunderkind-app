import { View, ViewProps } from 'react-native';

export function Card({ children, className = '', ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-white rounded-2xl p-4 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}
