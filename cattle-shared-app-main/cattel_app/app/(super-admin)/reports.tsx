import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { superAdminAPI } from '../../src/api/endpoints/admin';
import Toast from 'react-native-toast-message';

type ReportType = 'farmers' | 'cattle' | 'all';
type ReportFormat = 'excel' | 'csv';

export default function ReportsScreen() {
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>('all');
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('excel');

  const handleGenerateReport = async () => {
    Alert.alert(
      'Generate Report',
      `Generate ${selectedType} report in ${selectedFormat.toUpperCase()} format?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              setGenerating(true);

              const response = await superAdminAPI.generateReports({
                reportType: selectedType,
                format: selectedFormat,
              });

              Toast.show({
                type: 'success',
                text1: 'Report Generated',
                text2: 'Report has been generated successfully',
              });

            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || 'Failed to generate report',
              });
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Generate system-wide reports</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Report Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Type</Text>
          <ReportOption
            icon="people"
            title="Farmers Report"
            description="All registered farmers and their details"
            selected={selectedType === 'farmers'}
            onPress={() => setSelectedType('farmers')}
          />
          <ReportOption
            icon="paw"
            title="Cattle Report"
            description="All registered cattle with verification status"
            selected={selectedType === 'cattle'}
            onPress={() => setSelectedType('cattle')}
          />
          <ReportOption
            icon="document-text"
            title="Complete Report"
            description="Combined report with all farmers and cattle"
            selected={selectedType === 'all'}
            onPress={() => setSelectedType('all')}
          />
        </View>

        {/* Format Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Format</Text>
          <View style={styles.formatRow}>
            <TouchableOpacity
              style={[styles.formatButton, selectedFormat === 'excel' && styles.formatButtonActive]}
              onPress={() => setSelectedFormat('excel')}
            >
              <Ionicons
                name="document"
                size={24}
                color={selectedFormat === 'excel' ? '#6366F1' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.formatText,
                  selectedFormat === 'excel' && styles.formatTextActive,
                ]}
              >
                Excel (.xlsx)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.formatButton, selectedFormat === 'csv' && styles.formatButtonActive]}
              onPress={() => setSelectedFormat('csv')}
            >
              <Ionicons
                name="document-text"
                size={24}
                color={selectedFormat === 'csv' ? '#6366F1' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.formatText,
                  selectedFormat === 'csv' && styles.formatTextActive,
                ]}
              >
                CSV (.csv)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Report Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Will Include</Text>
          <View style={styles.previewCard}>
            {selectedType === 'farmers' || selectedType === 'all' ? (
              <>
                <PreviewItem icon="people" text="Farmer details (name, contact, location)" />
                <PreviewItem icon="checkmark-circle" text="Verification status" />
                <PreviewItem icon="calendar" text="Registration dates" />
              </>
            ) : null}

            {selectedType === 'cattle' || selectedType === 'all' ? (
              <>
                <PreviewItem icon="paw" text="Cattle details (ID, breed, age)" />
                <PreviewItem icon="shield-checkmark" text="Approval status" />
                <PreviewItem icon="person" text="Owner information" />
                <PreviewItem icon="location" text="Location data" />
              </>
            ) : null}

            <View style={styles.divider} />
            <PreviewItem icon="time" text={`Generated: ${new Date().toLocaleDateString()}`} />
            <PreviewItem icon="grid" text="Complete system-wide data" />
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, generating && styles.generateButtonDisabled]}
          onPress={handleGenerateReport}
          disabled={generating}
        >
          {generating ? (
            <>
              <ActivityIndicator color="white" style={styles.buttonLoader} />
              <Text style={styles.generateButtonText}>Generating Report...</Text>
            </>
          ) : (
            <>
              <Ionicons name="download" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.generateButtonText}>Generate Report</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#6366F1" />
          <Text style={styles.infoText}>
            Reports include all data from all regions. Export time may vary based on data volume.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ReportOption = ({ icon, title, description, selected, onPress }: any) => (
  <TouchableOpacity
    style={[styles.reportOption, selected && styles.reportOptionSelected]}
    onPress={onPress}
  >
    <View style={[styles.reportIconContainer, selected && styles.reportIconContainerSelected]}>
      <Ionicons name={icon} size={24} color={selected ? '#6366F1' : '#9CA3AF'} />
    </View>
    <View style={styles.reportContent}>
      <Text style={[styles.reportTitle, selected && styles.reportTitleSelected]}>{title}</Text>
      <Text style={styles.reportDescription}>{description}</Text>
    </View>
    {selected && <Ionicons name="checkmark-circle" size={24} color="#6366F1" />}
  </TouchableOpacity>
);

const PreviewItem = ({ icon, text }: any) => (
  <View style={styles.previewItem}>
    <Ionicons name={icon} size={16} color="#6B7280" />
    <Text style={styles.previewText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  content: { flex: 1 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  reportOption: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
  reportOptionSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  reportIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  reportIconContainerSelected: { backgroundColor: '#DBEAFE' },
  reportContent: { flex: 1, marginLeft: 12 },
  reportTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  reportTitleSelected: { color: '#6366F1' },
  reportDescription: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  formatRow: { flexDirection: 'row', gap: 12 },
  formatButton: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
  formatButtonActive: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  formatText: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginTop: 8 },
  formatTextActive: { color: '#6366F1' },
  previewCard: { backgroundColor: 'white', borderRadius: 12, padding: 16 },
  previewItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  previewText: { marginLeft: 12, fontSize: 14, color: '#374151' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  generateButton: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  generateButtonDisabled: { opacity: 0.6 },
  buttonLoader: { marginRight: 8 },
  buttonIcon: { marginRight: 8 },
  generateButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  infoCard: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'flex-start' },
  infoText: { flex: 1, marginLeft: 12, fontSize: 14, color: '#4338CA', lineHeight: 20 },
});
