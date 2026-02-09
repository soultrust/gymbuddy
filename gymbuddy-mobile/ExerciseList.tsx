import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

const styles = StyleSheet.create({
  home: {
    flex: 1,
    backgroundColor: 'red',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

const ExerciseList = () => {
  const [exercises, setExercises] = useState([])
  return (
    <View style={styles.home}>
      <ScrollView>
        <Text>Exercise List</Text>
        <TextInput style={{ height: 40, backgroundColor: 'yellow' }} />
      </ScrollView>
    </View>
  )
}

export default ExerciseList
