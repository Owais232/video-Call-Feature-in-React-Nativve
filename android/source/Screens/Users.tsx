import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Modal, Button, TouchableOpacity, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface User {
  userId: string; 
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export default function UsersScreen({ navigation }: { navigation: any }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged((user) => {
      if (user) {
        firestore().collection('users').doc(user.uid).get().then((doc) => {
          const data = doc.data();
          if (data) {
            setLoggedInUser({
              userId: user.uid,
              firstName: data.firstName || 'Unknown',
              lastName: data.lastName || 'User',
              phoneNumber: data.phoneNumber || 'No Number',
            });
          }
        });
      }
    });

    const unsubscribeFirestore = firestore().collection('users').onSnapshot(
      (snapshot) => {
        const userList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            userId: doc.id,
            firstName: data.firstName || 'Unknown',
            lastName: data.lastName || 'User',
            phoneNumber: data.phoneNumber || 'No Number',
          };
        });
        // Filter out the logged-in user's details from the list
        setUsers(userList.filter((user) => user.userId !== auth().currentUser?.uid));
      },
      (error) => {
        console.error('Error fetching users: ', error);
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, [navigation]);

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    setIsModalVisible(true);
  };

  const handlePhoneCall = () => {
    setIsModalVisible(false);
  };

  const handleVideoCall = () => {
    navigation.navigate('VideoCallScreen', { selectedUser });
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout Error', 'An error occurred while logging out. Please try again.');
    }
  };

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity onPress={() => handleUserPress(item)}>
      <View style={styles.userItem}>
        <Text>{item.firstName ? item.firstName : 'First Name Missing'} {item.lastName ? item.lastName : 'Last Name Missing'}</Text>
        <Text>User ID: {item.userId ? item.userId : 'No ID'}</Text>
        <Text>Phone: {item.phoneNumber ? item.phoneNumber : 'No Number'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Display logged-in user's details at the top */}
      {loggedInUser && (
        <TouchableOpacity onPress={() => setIsUserModalVisible(true)}>
          <View style={styles.loggedInUserContainer}>
            <Text style={styles.loggedInUserText}>
              {loggedInUser.firstName} {loggedInUser.lastName} (You)
            </Text>
            <Text>User ID: {loggedInUser.userId}</Text>
            <Text>Phone: {loggedInUser.phoneNumber}</Text>
          </View>
        </TouchableOpacity>
      )}

      <Text>All Registered Users</Text>
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.userId} // Use userId as unique key
      />

      {/* Modal for other users */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text>How would you like to contact {selectedUser?.firstName}?</Text>
            <Button title="Phone Call" onPress={handlePhoneCall} />
            <Button title="Video Call" onPress={handleVideoCall} />
            <Button title="Cancel" onPress={() => setIsModalVisible(false)} />
          </View>
        </View>
      </Modal>

      {/* Modal for logged-in user (Logout option) */}
      <Modal
        visible={isUserModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsUserModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text>Would you like to logout?</Text>
            <Button title="Logout" onPress={handleLogout} />
            <Button title="Cancel" onPress={() => setIsUserModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  userItem: {
    padding: 10,
    borderBottomWidth: 1,
    marginBottom: 15,
    borderWidth: 1.5,
    marginTop: 10,
    borderRadius: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: 300,
    alignItems: 'center',
  },
  loggedInUserContainer: {
    padding: 10,
    borderWidth: 1.5,
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  loggedInUserText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
