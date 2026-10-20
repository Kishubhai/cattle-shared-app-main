import React, { useState } from 'react';
import { View, TextInput, Text, Pressable, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export default function Input({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-gray-700 font-medium mb-2 text-sm">{label}</Text>
      )}
      
      <View
        className={`
          flex-row items-center bg-gray-50 rounded-xl px-4 py-1
          ${isFocused ? 'border-2 border-blue-500' : 'border border-gray-200'}
          ${error ? 'border-red-500' : ''}
        `}
      >
        {icon && <View className="mr-3">{icon}</View>}
        
        <TextInput
          className="flex-1 py-3 text-gray-800 text-base"
          placeholderTextColor="#9CA3AF"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {rightIcon && (
          <Pressable onPress={onRightIconPress} className="ml-3">
            {rightIcon}
          </Pressable>
        )}
      </View>
      
      {error && (
        <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text>
      )}
    </View>
  );
}