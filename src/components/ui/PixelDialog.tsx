import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { PixelText } from './PixelText';
import { Button } from './Button';
import { WK, pixelShadow } from '@/constants/theme';

interface PixelDialogProps {
  visible: boolean;
  title: string;
  message: string | React.ReactNode;
  onClose: () => void;
  /** If provided, renders Cancel + Confirm buttons instead of a single OK */
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'red' for destructive actions, 'yellow' for normal confirms */
  confirmVariant?: 'yellow' | 'red';
}

export function PixelDialog({
  visible,
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  confirmVariant = 'yellow',
}: PixelDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={{
            backgroundColor: WK.tealCard,
            borderWidth: 4,
            borderColor: WK.yellow,
            padding: 20,
            minWidth: 280,
            maxWidth: 340,
            ...pixelShadow,
          }}>
            <PixelText size={9} upper style={{ marginBottom: 12 }}>{title}</PixelText>
            {typeof message === 'string' ? (
              <PixelText size={7} dim style={{ marginBottom: 20, lineHeight: 14 }}>{message}</PixelText>
            ) : (
              <View style={{ marginBottom: 20 }}>{message}</View>
            )}

            {onConfirm ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  label={cancelLabel}
                  variant="teal"
                  onPress={onClose}
                  style={{ flex: 1 }}
                />
                <Button
                  label={confirmLabel}
                  variant={confirmVariant}
                  onPress={onConfirm}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <Button label="OK" variant="yellow" fullWidth onPress={onClose} />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
