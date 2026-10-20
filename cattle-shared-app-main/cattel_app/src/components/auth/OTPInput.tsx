import React, { useRef, useState } from 'react';
import { View, TextInput, Text } from 'react-native';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  error?: string;
}

export default function OTPInput({ length = 6, onComplete, error }: OTPInputProps) {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputs = useRef<TextInput[]>([]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View>
      <View className="flex-row justify-between mb-2">
        {Array(length)
          .fill(0)
          .map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                if (ref) inputs.current[index] = ref;
              }}
              className={`
                w-12 h-14 border-2 rounded-xl text-center text-xl font-bold
                ${otp[index] ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'}
                ${error ? 'border-red-500' : ''}
              `}
              maxLength={1}
              keyboardType="number-pad"
              value={otp[index]}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
            />
          ))}
      </View>
      {error && <Text className="text-red-500 text-xs text-center">{error}</Text>}
    </View>
  );
}