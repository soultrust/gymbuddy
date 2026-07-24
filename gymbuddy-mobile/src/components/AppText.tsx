import React from 'react'
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextProps,
  type TextInputProps,
} from 'react-native'
import { typography } from '../theme/tokens'

/** App-wide Text — Lato by default (override via style.fontFamily, e.g. Oswald wordmark) */
export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[{ fontFamily: typography.font.body }, style]} />
}

/** App-wide TextInput — Lato by default */
export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput {...props} style={[{ fontFamily: typography.font.body }, style]} />
}
