import { Pressable, Text, PressableProps } from 'react-native';

interface Props extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const VARIANT_STYLES = {
  primary: 'bg-blue-600 active:bg-blue-700',
  secondary: 'bg-gray-200 active:bg-gray-300',
  ghost: 'bg-transparent',
};

const LABEL_STYLES = {
  primary: 'text-white font-semibold',
  secondary: 'text-gray-800 font-semibold',
  ghost: 'text-blue-600 font-semibold',
};

export function Button({ label, variant = 'primary', ...rest }: Props) {
  return (
    <Pressable
      className={`px-4 py-2 rounded-lg items-center ${VARIANT_STYLES[variant]}`}
      {...rest}
    >
      <Text className={LABEL_STYLES[variant]}>{label}</Text>
    </Pressable>
  );
}
