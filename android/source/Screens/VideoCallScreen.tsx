import React, { useEffect, useRef, useState } from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
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

  // Use auth().currentUser safely by checking if it's not null
  const currentUser = auth().currentUser as FirebaseAuthTypes.User | null;
  const pc = useRef<RTCPeerConnection>(new RTCPeerConnection({ iceServers: [] }));
  const callId = currentUser ? `${currentUser.uid}_${selectedUser.userId}` : '';

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

    // ICE candidate event handler
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

    // Track event handler
    pc.current.ontrack = (event : any) => {
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
      <Button title="End Call" onPress={() => deleteCall(callId)} />
      <Button title="Call" onPress={handleCall} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  localStream: {
    width: '100%',
    height: '50%',
  },
  remoteStream: {
    width: '100%',
    height: '50%',
  },
});

export default VideoCallScreen;
