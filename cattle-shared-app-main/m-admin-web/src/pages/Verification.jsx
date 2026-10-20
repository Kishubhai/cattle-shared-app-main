import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mAdminAPI } from '../services/api';

const Verification = () => {
  const { cattleId } = useParams();
  const navigate = useNavigate();

  const [submittedCattle, setSubmittedCattle] = useState(null);
  const [allCattle, setAllCattle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('muzzle');
  const [selectedCompareCattle, setSelectedCompareCattle] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { id: 'muzzle', label: 'Muzzle' },
    { id: 'face', label: 'Face' },
    { id: 'left', label: 'Left Side' },
    { id: 'right', label: 'Right Side' },
    { id: 'fullBodyLeft', label: 'Full Body Left' },
    { id: 'fullBodyRight', label: 'Full Body Right' },
  ];

  useEffect(() => {
    fetchCattleData();
  }, [cattleId]);

  const fetchCattleData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await mAdminAPI.getCattleForVerification(cattleId);

      if (response.success) {
        setSubmittedCattle(response.data.submittedCattle);
        setAllCattle(response.data.allCattle);
        if (response.data.allCattle.length > 0) {
          setSelectedCompareCattle(response.data.allCattle[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching cattle data:', err);
      setError('Failed to load cattle data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to APPROVE this cattle registration?')) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await mAdminAPI.approveCattle(cattleId);

      if (response.success) {
        alert('Cattle approved successfully!');
        navigate('/dashboard');
      }
    } catch (err) {
      alert(err.message || 'Failed to approve cattle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setSubmitting(true);
      const response = await mAdminAPI.rejectCattle(cattleId, rejectionReason);

      if (response.success) {
        alert('Cattle rejected successfully!');
        navigate('/dashboard');
      }
    } catch (err) {
      alert(err.message || 'Failed to reject cattle');
    } finally {
      setSubmitting(false);
      setShowRejectModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cattle data...</p>
        </div>
      </div>
    );
  }

  if (error || !submittedCattle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Cattle not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-indigo-600 hover:text-indigo-800 font-medium mb-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Cattle Verification - {submittedCattle.temporaryId || submittedCattle.cattleId}
              </h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={submitting}
                className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Category Selector */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex space-x-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-[calc(100vh-180px)]">
        {/* LEFT: Submitted Cattle */}
        <div className="bg-white border-r overflow-y-auto">
          <div className="sticky top-0 bg-indigo-600 text-white px-6 py-4 z-10">
            <h2 className="text-xl font-bold">SUBMITTED CATTLE</h2>
            <p className="text-indigo-100 text-sm mt-1">Review this cattle for verification</p>
          </div>

          <div className="p-6">
            {/* Cattle Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Cattle Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">ID:</span>
                  <span className="ml-2 font-medium">{submittedCattle.temporaryId}</span>
                </div>
                <div>
                  <span className="text-gray-600">Breed:</span>
                  <span className="ml-2 font-medium">{submittedCattle.breed}</span>
                </div>
                <div>
                  <span className="text-gray-600">Age:</span>
                  <span className="ml-2 font-medium">{submittedCattle.age} years</span>
                </div>
                <div>
                  <span className="text-gray-600">Tag No:</span>
                  <span className="ml-2 font-medium">{submittedCattle.tagNo || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Owner:</span>
                  <span className="ml-2 font-medium">
                    {submittedCattle.owner?.firstName} {submittedCattle.owner?.lastName}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Location:</span>
                  <span className="ml-2 font-medium">
                    {submittedCattle.location?.district}, {submittedCattle.location?.state}
                  </span>
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                {categories.find((c) => c.id === selectedCategory)?.label} Images
              </h3>
              {submittedCattle.formattedImages[selectedCategory]?.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {submittedCattle.formattedImages[selectedCategory].map((img, idx) => (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <img
                        src={img.url}
                        alt={`${selectedCategory} ${idx + 1}`}
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No images available</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: All Other Cattle */}
        <div className="bg-gray-50 overflow-y-auto">
          <div className="sticky top-0 bg-green-600 text-white px-6 py-4 z-10">
            <h2 className="text-xl font-bold">ALL CATTLE DATABASE ({allCattle.length})</h2>
            <p className="text-green-100 text-sm mt-1">
              Compare with existing cattle to check for duplicates
            </p>
          </div>

          <div className="p-6">
            {allCattle.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No other cattle in database</p>
                <p className="text-sm text-gray-500 mt-2">This will be the first cattle</p>
              </div>
            ) : (
              <div className="space-y-6">
                {allCattle.map((cattle) => (
                  <div
                    key={cattle._id}
                    className={`bg-white rounded-lg border-2 transition cursor-pointer ${
                      selectedCompareCattle?._id === cattle._id
                        ? 'border-green-500 shadow-lg'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                    onClick={() => setSelectedCompareCattle(cattle)}
                  >
                    {/* Cattle Header */}
                    <div className="px-4 py-3 bg-gray-50 border-b">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-900">{cattle.cattleId}</h4>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            cattle.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {cattle.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {cattle.breed} • {cattle.age} years • Owner: {cattle.owner?.firstName}{' '}
                        {cattle.owner?.lastName}
                      </div>
                    </div>

                    {/* Images */}
                    {cattle.formattedImages[selectedCategory]?.length > 0 && (
                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-2">
                          {cattle.formattedImages[selectedCategory].map((img, idx) => (
                            <img
                              key={idx}
                              src={img.url}
                              alt={`${selectedCategory} ${idx + 1}`}
                              className="w-full h-24 object-cover rounded border"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Cattle</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this cattle registration:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows="4"
              placeholder="Enter rejection reason..."
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {submitting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Verification;
