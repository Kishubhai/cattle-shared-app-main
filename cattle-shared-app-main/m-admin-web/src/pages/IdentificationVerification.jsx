import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mAdminAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const BASE_URL = API_BASE_URL.replace('/api/v1', '');

const IdentificationVerification = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [farmerCattle, setFarmerCattle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCattle, setSelectedCattle] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedView, setSelectedView] = useState('front');
  const [expandedCattleId, setExpandedCattleId] = useState(null);

  const views = ['front', 'back', 'right', 'left'];
  const cattleImageCategories = [
    { key: 'muzzle', label: 'Muzzle', count: 3 },
    { key: 'face', label: 'Face', count: 3 },
    { key: 'left', label: 'Left Side', count: 3 },
    { key: 'right', label: 'Right Side', count: 3 },
    { key: 'fullBodyLeft', label: 'Full Body Left', count: 1 },
    { key: 'fullBodyRight', label: 'Full Body Right', count: 1 }
  ];

  // Helper function to get full image URL
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

  useEffect(() => {
    fetchData();
  }, [requestId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [requestResponse, cattleResponse] = await Promise.all([
        mAdminAPI.getIdentificationRequest(requestId),
        mAdminAPI.getFarmerCattleForIdentification(requestId),
      ]);

      if (requestResponse.success) {
        setRequest(requestResponse.data);
      }

      if (cattleResponse.success) {
        setFarmerCattle(cattleResponse.data.cattle || []);
        if (cattleResponse.data.cattle?.length > 0) {
          setSelectedCattle(cattleResponse.data.cattle[0]);
        }
      }
    } catch (err) {
      setError('Failed to load identification request data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedCattle) {
      toast.error('Please select a cattle to match');
      return;
    }

    try {
      setSubmitting(true);

      if (request.status === 'pending') {
        try {
          await mAdminAPI.startProcessingIdentification(requestId);
        } catch {
          // Continue anyway - might already be processing
        }
      }

      const response = await mAdminAPI.completeIdentification(requestId, {
        found: true,
        cattleId: selectedCattle._id,
        message: `Successfully identified as cattle ${selectedCattle.cattleId}`,
      });

      if (response.success) {
        toast.success('Identification approved successfully!');
        navigate('/identification-requests');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to approve identification');
    } finally {
      setSubmitting(false);
      setShowApproveModal(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionMessage.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);

      if (request.status === 'pending') {
        try {
          await mAdminAPI.startProcessingIdentification(requestId);
        } catch {
          // Continue anyway - might already be processing
        }
      }

      const response = await mAdminAPI.failIdentification(requestId, {
        message: rejectionMessage,
        reason: rejectionMessage,
      });

      if (response.success) {
        toast.success('Identification rejected successfully!');
        navigate('/identification-requests');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reject identification');
    } finally {
      setSubmitting(false);
      setShowRejectModal(false);
    }
  };

  const handleNotFound = async () => {
    try {
      setSubmitting(true);

      if (request.status === 'pending') {
        try {
          await mAdminAPI.startProcessingIdentification(requestId);
        } catch {
          // Continue anyway - might already be processing
        }
      }

      const response = await mAdminAPI.completeIdentification(requestId, {
        found: false,
        message: "No matching cattle found in farmer's registered cattle",
      });

      if (response.success) {
        toast.success('Marked as not found successfully!');
        navigate('/identification-requests');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to mark as not found');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading identification request...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error || 'Request not found'}</p>
          <button
            onClick={() => navigate('/identification-requests')}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Back to Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/identification-requests')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Identification Verification</h1>
                <p className="text-sm text-gray-600 mt-1">Request ID: {request.requestId}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleNotFound}
                disabled={submitting}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
              >
                Not Found
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={submitting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={submitting || !selectedCattle}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                Approve Match
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Submitted Images */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 bg-indigo-50">
              <h2 className="text-lg font-semibold text-gray-900">Submitted Images for Identification</h2>
              <p className="text-sm text-gray-600 mt-1">
                Farmer: {request.user?.firstName} {request.user?.lastName} - {request.user?.mobileNumber}
              </p>
            </div>

            <div className="p-6">
              {/* View Tabs */}
              <div className="flex gap-2 mb-4">
                {views.map((view) => (
                  <button
                    key={view}
                    onClick={() => setSelectedView(view)}
                    className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                      selectedView === view
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>

              {/* Large Image Display */}
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                {request.images?.[selectedView] && (
                  <img
                    src={getImageUrl(request.images[selectedView].url)}
                    alt={`${selectedView} view`}
                    className="w-full h-96 object-contain"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                    }}
                  />
                )}
              </div>

              {/* All Thumbnails */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                {views.map((view) => (
                  request.images?.[view] && (
                    <div
                      key={view}
                      onClick={() => setSelectedView(view)}
                      className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition ${
                        selectedView === view ? 'border-indigo-600' : 'border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      <img
                        src={getImageUrl(request.images[view].url)}
                        alt={`${view} view`}
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';
                        }}
                      />
                      <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs text-center py-1 capitalize">
                        {view}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Right: Farmer's Cattle */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Farmer's Registered Cattle ({farmerCattle.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Match the submitted images with one of these cattle
              </p>
            </div>

            <div className="p-6">
              {farmerCattle.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="mt-4 text-gray-600">This farmer has no registered cattle</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {farmerCattle.map((cattle) => {
                    const isExpanded = expandedCattleId === cattle._id;

                    return (
                      <div
                        key={cattle._id}
                        className={`border-2 rounded-lg transition ${
                          selectedCattle?._id === cattle._id
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-300'
                        }`}
                      >
                        {/* Cattle Header */}
                        <div
                          onClick={() => setSelectedCattle(cattle)}
                          className="p-4 cursor-pointer hover:bg-gray-50"
                        >
                          <div className="flex items-start gap-4">
                            {/* Cattle Images */}
                            <div className="flex gap-2">
                              {cattle.images?.face?.[0] && (
                                <img
                                  src={getImageUrl(cattle.images.face[0].url)}
                                  alt="Face"
                                  className="w-20 h-20 object-cover rounded border"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23ddd" width="80" height="80"/%3E%3C/svg%3E';
                                  }}
                                />
                              )}
                              {cattle.images?.muzzle?.[0] && (
                                <img
                                  src={getImageUrl(cattle.images.muzzle[0].url)}
                                  alt="Muzzle"
                                  className="w-20 h-20 object-cover rounded border"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23ddd" width="80" height="80"/%3E%3C/svg%3E';
                                  }}
                                />
                              )}
                            </div>

                            {/* Cattle Info */}
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900">{cattle.cattleId}</h3>
                              <div className="text-sm text-gray-600 mt-1 space-y-1">
                                <p>Breed: {cattle.breed}</p>
                                <p>Age: {cattle.age} years</p>
                                {cattle.type && <p>Type: {cattle.type}</p>}
                                {cattle.color && <p>Color: {cattle.color}</p>}
                                <p className="text-xs text-gray-500 mt-2">
                                  Registered: {new Date(cattle.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex-shrink-0 flex flex-col gap-2">
                              {selectedCattle?._id === cattle._id && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-600 text-white">
                                  ✓ Selected
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCattleId(isExpanded ? null : cattle._id);
                                }}
                                className="px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition flex items-center gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                    Hide Images
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    View All 14
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Images Section */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50 p-4">
                            <div className="space-y-4">
                              {cattleImageCategories.map((category) => {
                                const images = cattle.images?.[category.key];
                                if (!images || images.length === 0) return null;

                                return (
                                  <div key={category.key}>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                      {category.label} ({images.length})
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                      {images.map((img, index) => (
                                        <div key={index} className="border border-gray-300 rounded overflow-hidden bg-white">
                                          <img
                                            src={getImageUrl(img.url)}
                                            alt={`${category.label} ${index + 1}`}
                                            className="w-full h-32 object-contain"
                                            onError={(e) => {
                                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23ddd" width="200" height="150"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                                            }}
                                          />
                                          <div className="bg-gray-100 px-2 py-1 text-xs text-gray-600 text-center">
                                            #{index + 1}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Identification Match</h3>
            <p className="text-gray-600 mb-4">
              Are you sure the submitted images match with cattle:
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="font-bold text-gray-900">{selectedCattle?.cattleId}</p>
              <p className="text-sm text-gray-600">{selectedCattle?.breed}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Identification Request</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this identification request:
            </p>
            <textarea
              value={rejectionMessage}
              onChange={(e) => setRejectionMessage(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 h-32 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionMessage('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !rejectionMessage.trim()}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentificationVerification;
