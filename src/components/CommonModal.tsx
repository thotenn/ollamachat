import React, { useEffect } from 'react';
import { Modal, ModalProps, BackHandler } from 'react-native';

interface CommonModalProps extends ModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}

const CommonModal: React.FC<CommonModalProps> = ({
  visible,
  onRequestClose,
  children,
  ...modalProps
}) => {
  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      onRequestClose();
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      backHandler.remove();
    };
  }, [visible, onRequestClose]);

  return (
    <Modal
      visible={visible}
      onRequestClose={onRequestClose}
      {...modalProps}
    >
      {children}
    </Modal>
  );
};

export default CommonModal;