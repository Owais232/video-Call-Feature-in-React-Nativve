import React, { useEffect, useRef, useState } from 'react';
import { View, Alert, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  RTCView,
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  MediaStream,
} from 'react-native-webrtc';
import firestore from '@react-native-firebase/firestore';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { addCall, getCall, deleteCall } from './firestoreService';
import { useNavigation } from '@react-navigation/native';

interface User {
  userId: string;
  firstName: string;
  lastName: string;
}

interface VideoCallScreenProps {
  route: {
    params: {
      selectedUser: User;
    };
  };
}

const VideoCallScreen = ({ route }: VideoCallScreenProps) => {
  const { selectedUser } = route.params;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const currentUser = auth().currentUser as FirebaseAuthTypes.User | null;
  const pc = useRef<RTCPeerConnection>(new RTCPeerConnection({ iceServers: [] }));
  const callId = currentUser ? `${currentUser.uid}_${selectedUser.userId}` : '';
  
  const navigation = useNavigation(); // Added for navigation

  useEffect(() => {
    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const initLocalStream = async () => {
      try {
        const stream = await mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);

        stream.getTracks().forEach((track) => {
          pc.current.addTrack(track, stream);
        });
      } catch (error) {
        console.error('Error accessing media devices: ', error);
        Alert.alert('Error', 'Could not access media devices');
      }
    };

    initLocalStream();

    const unsubscribe = firestore()
      .collection('calls')
      .doc(callId)
      .onSnapshot(async (snapshot) => {
        const data = snapshot.data();
        if (data) {
          if (data.offer) {
            await pc.current.setRemoteDescription(
              new RTCSessionDescription(data.offer)
            );
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
            await addCall(callId, { answer });
          } else if (data.answer) {
            await pc.current.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
          }
        }
      });

    pc.current.onicecandidate = (event: any) => {
      if (event.candidate) {
        firestore()
          .collection('calls')
          .doc(callId)
          .update({
            candidates: firestore.FieldValue.arrayUnion(event.candidate.toJSON()),
          });
      }
    };

    pc.current.ontrack = (event: any) => {
      setRemoteStream(event.streams[0]);
    };

    return () => {
      unsubscribe();
      pc.current.close();
    };
  }, [callId, currentUser]);

  const handleCall = async () => {
    try {
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      await addCall(callId, { offer });
    } catch (error) {
      console.error('Error creating call offer: ', error);
      Alert.alert('Error', 'Failed to initiate call');
    }
  };

  const handleEndCall = async () => {
    try {
      await deleteCall(callId); // End the call in Firestore
      pc.current.close(); // Close the peer connection
      navigation.goBack(); // Navigate back to the previous screen
    } catch (error) {
      console.error('Error ending the call: ', error);
      Alert.alert('Error', 'Failed to end the call');
    }
  };

  return (
    <View style={styles.container}>
      {/* Local Stream */}
      {localStream && (
        <RTCView style={styles.localStream} streamURL={localStream.toURL()} />
      )}
      {/* Remote Stream */}
      {remoteStream && (
        <RTCView style={styles.remoteStream} streamURL={remoteStream.toURL()} />
      )}

      {/* Call and End Call buttons using Text */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <Text style={styles.endCallButtonText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  localStream: {
    width: '100%',
    height: '40%',
    backgroundColor: '#1f1f1f',
  },
  remoteStream: {
    width: '100%',
    height: '40%',
    backgroundColor: '#1f1f1f',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginVertical: 20,
  },
  callButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  endCallButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default VideoCallScreen;
