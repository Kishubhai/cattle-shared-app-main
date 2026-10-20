import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { superAdminAPI } from '../../src/api/endpoints/admin';
import ImageUploadGrid from '../../src/components/cattle/ImageUploadGrid';
import { appendCattleRegistrationImages } from '../../src/utils/cattleUpload';

export default function AddCattleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);

  const [formData, setFormData] = useState({
    breed: '',
    tagNo: '',
    age: '',
    type: '',
    color: '',
    medicalHistory: '',
    images: {
      muzzle: [] as string[],
      face: [] as string[],
      fullBodyLeft: [] as string[],
      fullBodyRight: [] as string[],
    },
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    setLoadingFarmers(true);
    try {
      const response = await superAdminAPI.getAllFarmers({ page: 1, limit: 100 });
      setFarmers(response.data.users || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load farmers',
      });
    } finally {
      setLoadingFarmers(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  const updateImages = (category: string, images: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images: { ...prev.images, [category]: images },
    }));
    setErrors((prev: any) => ({
      ...prev,
      images: { ...prev.images, [category]: '' },
    }));
  };

  const validateStep1 = (): boolean => {
    const newErrors: any = {};
    if (!selectedFarmer) newErrors.farmer = 'Please select a farmer';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: any = {};
    if (!formData.breed.trim()) newErrors.breed = 'Breed is required';
    if (!formData.tagNo.trim()) newErrors.tagNo = 'Tag number is required';
    if (!formData.age.trim()) {
      newErrors.age = 'Age is required';
    } else if (isNaN(Number(formData.age)) || Number(formData.age) <= 0) {
      newErrors.age = 'Age must be a valid number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: any = { images: {} };
    if (formData.images.muzzle.length < 5) newErrors.images.muzzle = 'Upload 5 muzzle images';
    if (formData.images.face.length < 5) newErrors.images.face = 'Upload 5 face images';
    if (formData.images.fullBodyLeft.length < 1) newErrors.images.fullBodyLeft = 'Upload full body left image';
    if (formData.images.fullBodyRight.length < 1) newErrors.images.fullBodyRight = 'Upload full body right image';
    setErrors(newErrors);
    return Object.keys(newErrors.images || {}).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep3()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please upload all required images',
      });
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();

      // Add owner ID
      formDataToSend.append('ownerId', selectedFarmer._id);

      // Add text fields
      formDataToSend.append('breed', formData.breed);
      formDataToSend.append('tagNo', formData.tagNo);
      formDataToSend.append('age', formData.age);
      if (formData.type) formDataToSend.append('type', formData.type);
      if (formData.color) formDataToSend.append('color', formData.color);
      if (formData.medicalHistory) formDataToSend.append('medicalHistory', formData.medicalHistory);

      await appendCattleRegistrationImages(formDataToSend, formData.images);

      await superAdminAPI.registerCattle(formDataToSend);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Cattle registered successfully',
      });

      router.back();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to register cattle',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const filteredFarmers = farmers.filter((f) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      f.firstName?.toLowerCase().includes(searchLower) ||
      f.lastName?.toLowerCase().includes(searchLower) ||
      f.mobileNumber?.includes(searchLower) ||
      f.email?.toLowerCase().includes(searchLower)
    );
  });

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>Step {currentStep} of 3</Text>
        <Text style={styles.progressLabel}>
          {currentStep === 1 ? 'Select Farmer' : currentStep === 2 ? 'Cattle Details' : 'Upload Images'}
        </Text>
      </View>
      <View style={styles.progressBarContainer}>
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={[styles.progressBar, step <= currentStep ? styles.progressBarActive : styles.progressBarInactive]}
          />
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Select Farmer</Text>
      <Text style={styles.stepSubtitle}>Choose the farmer who owns this cattle</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, mobile, or email"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {errors.farmer && <Text style={styles.errorText}>{errors.farmer}</Text>}

      {loadingFarmers ? (
        <ActivityIndicator size="large" color="#6366F1" style={styles.loader} />
      ) : filteredFarmers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No farmers found</Text>
        </View>
      ) : (
        <ScrollView style={styles.farmerList} nestedScrollEnabled>
          {filteredFarmers.map((farmer) => (
            <TouchableOpacity
              key={farmer._id}
              style={[styles.farmerCard, selectedFarmer?._id === farmer._id && styles.farmerCardSelected]}
              onPress={() => {
                setSelectedFarmer(farmer);
                setErrors({ ...errors, farmer: '' });
              }}
            >
              <View style={styles.farmerInfo}>
                <Text style={styles.farmerName}>
                  {farmer.firstName} {farmer.lastName}
                </Text>
                <Text style={styles.farmerDetails}>{farmer.mobileNumber}</Text>
                <Text style={styles.farmerDetails}>
                  {farmer.address?.district}, {farmer.address?.state}
                </Text>
              </View>
              {selectedFarmer?._id === farmer._id && (
                <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Cattle Details</Text>
      <Text style={styles.stepSubtitle}>Enter cattle information</Text>

      <View style={styles.selectedFarmerBanner}>
        <Ionicons name="person" size={20} color="#6366F1" />
        <Text style={styles.selectedFarmerText}>
          Owner: {selectedFarmer?.firstName} {selectedFarmer?.lastName}
        </Text>
      </View>

      <Text style={styles.label}>Breed *</Text>
      <TextInput
        style={[styles.input, errors.breed && styles.inputError]}
        value={formData.breed}
        onChangeText={(v) => updateField('breed', v)}
        placeholder="Enter cattle breed"
        placeholderTextColor="#9CA3AF"
      />
      {errors.breed && <Text style={styles.errorText}>{errors.breed}</Text>}

      <Text style={styles.label}>Tag Number *</Text>
      <TextInput
        style={[styles.input, errors.tagNo && styles.inputError]}
        value={formData.tagNo}
        onChangeText={(v) => updateField('tagNo', v)}
        placeholder="Enter tag number"
        placeholderTextColor="#9CA3AF"
      />
      {errors.tagNo && <Text style={styles.errorText}>{errors.tagNo}</Text>}

      <Text style={styles.label}>Age (in years) *</Text>
      <TextInput
        style={[styles.input, errors.age && styles.inputError]}
        value={formData.age}
        onChangeText={(v) => updateField('age', v.replace(/[^0-9]/g, ''))}
        placeholder="Enter age"
        keyboardType="number-pad"
        placeholderTextColor="#9CA3AF"
      />
      {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}

      <Text style={styles.label}>Type</Text>
      <TextInput
        style={styles.input}
        value={formData.type}
        onChangeText={(v) => updateField('type', v)}
        placeholder="e.g., Dairy, Beef"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>Color</Text>
      <TextInput
        style={styles.input}
        value={formData.color}
        onChangeText={(v) => updateField('color', v)}
        placeholder="Enter color"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>Medical History</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.medicalHistory}
        onChangeText={(v) => updateField('medicalHistory', v)}
        placeholder="Enter medical history or notes"
        multiline
        numberOfLines={4}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Upload Images</Text>
      <Text style={styles.stepSubtitle}>Upload clear images from different angles</Text>

      <View style={styles.guidelinesBox}>
        <Ionicons name="information-circle" size={20} color="#2563EB" />
        <View style={styles.guidelinesContent}>
          <Text style={styles.guidelinesTitle}>Important Guidelines</Text>
          <Text style={styles.guidelinesText}>
            • Ensure good lighting and clear images{'\n'}
            • Do not capture cattle with face rope or nose rope{'\n'}
            • Images must show clear facial features{'\n'}
            • Capture 5 muzzle + 5 face + full body left/right{'\n'}
            • All 12 photos are uploaded for registration
          </Text>
        </View>
      </View>

      <ImageUploadGrid
        label="Muzzle Images"
        required={5}
        images={formData.images.muzzle}
        onImagesChange={(images) => updateImages('muzzle', images)}
        error={errors.images?.muzzle}
      />

      <ImageUploadGrid
        label="Face Images"
        required={5}
        images={formData.images.face}
        onImagesChange={(images) => updateImages('face', images)}
        error={errors.images?.face}
      />

      <ImageUploadGrid
        label="Full Body Left"
        required={1}
        images={formData.images.fullBodyLeft}
        onImagesChange={(images) => updateImages('fullBodyLeft', images)}
        error={errors.images?.fullBodyLeft}
      />

      <ImageUploadGrid
        label="Full Body Right"
        required={1}
        images={formData.images.fullBodyRight}
        onImagesChange={(images) => updateImages('fullBodyRight', images)}
        error={errors.images?.fullBodyRight}
      />

      <View style={styles.imageCountBox}>
        <Text style={styles.imageCountText}>
          Total Images: {Object.values(formData.images).flat().length}/12
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Register Cattle</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            {renderProgressBar()}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
              {currentStep < 3 ? (
                <>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
                    <Text style={styles.primaryButtonText}>Continue</Text>
                  </TouchableOpacity>
                  {currentStep > 1 && (
                    <TouchableOpacity style={styles.secondaryButton} onPress={handlePreviousStep}>
                      <Text style={styles.secondaryButtonText}>Previous</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <ActivityIndicator color="white" style={styles.buttonLoader} />
                        <Text style={styles.primaryButtonText}>Registering...</Text>
                      </>
                    ) : (
                      <Text style={styles.primaryButtonText}>Submit for Verification</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={handlePreviousStep}>
                    <Text style={styles.secondaryButtonText}>Previous</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  content: { flex: 1 },
  formContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  progressContainer: { marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  progressLabel: { fontSize: 14, color: '#6B7280' },
  progressBarContainer: { flexDirection: 'row', gap: 8 },
  progressBar: { flex: 1, height: 8, borderRadius: 4 },
  progressBarActive: { backgroundColor: '#6366F1' },
  progressBarInactive: { backgroundColor: '#E5E7EB' },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: '#6B7280', marginBottom: 24 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  loader: { marginVertical: 40 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#9CA3AF' },
  farmerList: { maxHeight: 400 },
  farmerCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#E5E7EB' },
  farmerCardSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  farmerInfo: { flex: 1 },
  farmerName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  farmerDetails: { fontSize: 14, color: '#6B7280' },
  selectedFarmerBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, marginBottom: 16 },
  selectedFarmerText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#6366F1' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827' },
  inputError: { borderColor: '#EF4444' },
  textArea: { height: 100, textAlignVertical: 'top' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  guidelinesBox: { flexDirection: 'row', backgroundColor: '#EEF2FF', padding: 16, borderRadius: 12, marginBottom: 16 },
  guidelinesContent: { flex: 1, marginLeft: 12 },
  guidelinesTitle: { fontSize: 14, fontWeight: '600', color: '#1E40AF', marginBottom: 4 },
  guidelinesText: { fontSize: 12, color: '#3B82F6', lineHeight: 18 },
  imageCountBox: { backgroundColor: '#ECFDF5', padding: 12, borderRadius: 8, marginTop: 16 },
  imageCountText: { fontSize: 14, fontWeight: '600', color: '#047857' },
  buttonContainer: { marginTop: 24, gap: 12 },
  primaryButton: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  secondaryButton: { backgroundColor: 'white', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: '#6366F1', textAlign: 'center' },
  buttonLoader: { marginRight: 8 },
});
