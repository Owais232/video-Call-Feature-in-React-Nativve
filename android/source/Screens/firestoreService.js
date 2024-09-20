import firestore from '@react-native-firebase/firestore';

const addCall = async (callId, callData) => {
  await firestore().collection('calls').doc(callId).set(callData);
};

const getCall = async (callId) => {
  const doc = await firestore().collection('calls').doc(callId).get();
  return doc.exists ? doc.data() : null;
};

const deleteCall = async (callId) => {
  await firestore().collection('calls').doc(callId).delete();
};

export { addCall, getCall, deleteCall };
