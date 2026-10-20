import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mAdminAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

const IdentificationHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    page: 1,
    limit: 20
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [modifyingRequest, setModifyingRequest] = useState(null);
  const [modifyFormData, setModifyFormData] = useState({
    newDecision: '',
    matchedCattleId: '',
    message: ''
  });
  const [farmerCattle, setFarmerCattle] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, [filters.status, filters.page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit
      };

      if (filters.status !== 'all') {
        params.status = filters.status;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      const response = await mAdminAPI.getIdentificationHistory(params);

      if (response.success) {
        setHistory(response.data.requests);
        setTotalPages(response.data.pagination.pages);
        setTotalRecords(response.data.pagination.total);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load identification history');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
    fetchHistory();
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

  const openModifyDialog = async (request) => {
    setModifyingRequest(request);
    setModifyFormData({
      newDecision: '',
      matchedCattleId: '',
      message: ''
    });

    // Fetch farmer's cattle for the dropdown
    try {
      const response = await mAdminAPI.getFarmerCattleForIdentification(request._id);
      if (response.success) {
        setFarmerCattle(response.data.cattle);
      }
    } catch (error) {
      toast.error('Failed to load farmer cattle');
    }
  };

  const closeModifyDialog = () => {
    setModifyingRequest(null);
    setModifyFormData({ newDecision: '', matchedCattleId: '', message: '' });
    setFarmerCattle([]);
  };

  const handleModifyDecision = async (e) => {
    e.preventDefault();

    if (modifyFormData.newDecision === 'found' && !modifyFormData.matchedCattleId) {
      toast.error('Please select the matched cattle');
      return;
    }

    if (modifyFormData.newDecision === 'not_found' && !modifyFormData.message.trim()) {
      toast.error('Please provide a reason for not finding the cattle');
      return;
    }

    if (modifyFormData.newDecision === 'fail' && !modifyFormData.message.trim()) {
      toast.error('Please provide a reason for marking as failed');
      return;
    }

    try {
      const response = await mAdminAPI.updateIdentificationDecision(modifyingRequest._id, {
        newDecision: modifyFormData.newDecision,
        matchedCattleId: modifyFormData.matchedCattleId || undefined,
        message: modifyFormData.message
      });

      if (response.success) {
        toast.success(response.message || 'Decision updated successfully');
        closeModifyDialog();
        fetchHistory();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update decision');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      completed: 'bg-green-100 text-green-800 border-green-300',
      failed: 'bg-red-100 text-red-800 border-red-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      processing: 'bg-blue-100 text-blue-800 border-blue-300'
    };

    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getResultBadge = (result) => {
    if (!result) return null;

    const resultClasses = {
      found: 'bg-green-100 text-green-800',
      not_found: 'bg-red-100 text-red-800',
      fail: 'bg-gray-100 text-gray-800'
    };

    const resultLabels = {
      found: 'FOUND',
      not_found: 'NOT FOUND',
      fail: 'FAILED'
    };

    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${resultClasses[result] || 'bg-gray-100 text-gray-800'}`}>
        {resultLabels[result] || result.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Identification History</h1>
              <p className="mt-2 text-sm text-gray-600">
                View and modify cattle identification decisions
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Request ID or Phone
              </label>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Enter Request ID or Phone..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </form>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {history.length} of {totalRecords} records
          </div>
        </div>

        {/* History List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No history found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.status !== 'all'
                ? 'Try adjusting your filters'
                : 'No identification history available'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((request) => (
              <div
                key={request._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Request #{request.requestId}
                        </h3>
                        {getStatusBadge(request.status)}
                        {request.result && getResultBadge(request.result)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Submitted: {new Date(request.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Farmer Info */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Farmer Details</p>
                    <p className="text-sm font-medium text-gray-900">{request.farmer?.fullName}</p>
                    <p className="text-sm text-gray-600">{request.farmer?.mobileNumber}</p>
                  </div>

                  {/* Submitted Images */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Submitted Images</p>
                    <div className="flex flex-wrap gap-2">
                      {['front', 'back', 'right', 'left'].map((view) => (
                        request.images[view] && (
                          <div key={view} className="text-center">
                            <img
                              src={getImageUrl(request.images[view].url)}
                              alt={view}
                              className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                              onError={(e) => {
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <p className="text-xs text-gray-500 mt-1 capitalize">{view}</p>
                          </div>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Result Details */}
                  {request.result === 'found' && request.matchedCattle && (
                    <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-700 font-medium mb-2">Matched Cattle</p>
                      <div className="flex items-center gap-3">
                        {request.matchedCattle.images?.front && (
                          <img
                            src={getImageUrl(request.matchedCattle.images.front.url)}
                            alt="Matched cattle"
                            className="w-16 h-16 object-cover rounded-lg border-2 border-green-300"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Cattle ID: {request.matchedCattle.cattleId}
                          </p>
                          <p className="text-sm text-gray-600">
                            Breed: {request.matchedCattle.breed}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {request.message && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Message</p>
                      <p className="text-sm text-gray-700">{request.message}</p>
                    </div>
                  )}

                  {/* Processed By & At */}
                  {request.processedBy && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500">Processed By</p>
                      <p className="text-sm font-medium text-gray-900">
                        {request.processedBy.fullName}
                      </p>
                      {request.completedAt && (
                        <p className="text-xs text-gray-600">
                          Completed: {new Date(request.completedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => openModifyDialog(request)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Modify Decision
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={filters.page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {filters.page} of {totalPages}
            </span>
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              disabled={filters.page === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modify Decision Modal */}
      {modifyingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Modify Identification Decision
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Request ID:</span> {modifyingRequest.requestId}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Current Result:</span>{' '}
                  <span className="capitalize">{modifyingRequest.result || 'N/A'}</span>
                </p>
              </div>

              <form onSubmit={handleModifyDecision}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Decision
                  </label>
                  <select
                    value={modifyFormData.newDecision}
                    onChange={(e) => setModifyFormData(prev => ({ ...prev, newDecision: e.target.value, matchedCattleId: '' }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Decision</option>
                    <option value="found">Found (Match with Cattle)</option>
                    <option value="not_found">Not Found</option>
                    <option value="fail">Mark as Failed</option>
                  </select>
                </div>

                {modifyFormData.newDecision === 'found' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Matched Cattle *
                    </label>
                    <select
                      value={modifyFormData.matchedCattleId}
                      onChange={(e) => setModifyFormData(prev => ({ ...prev, matchedCattleId: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select cattle...</option>
                      {farmerCattle.map((cattle) => (
                        <option key={cattle._id} value={cattle._id}>
                          {cattle.cattleId} - {cattle.breed} ({cattle.age}y, {cattle.gender})
                        </option>
                      ))}
                    </select>
                    {farmerCattle.length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">No cattle available for this farmer</p>
                    )}
                  </div>
                )}

                {(modifyFormData.newDecision === 'not_found' || modifyFormData.newDecision === 'fail') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason *
                    </label>
                    <textarea
                      value={modifyFormData.message}
                      onChange={(e) => setModifyFormData(prev => ({ ...prev, message: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Explain why this decision is being changed..."
                      required
                    />
                  </div>
                )}

                {modifyFormData.newDecision === 'found' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message (Optional)
                    </label>
                    <textarea
                      value={modifyFormData.message}
                      onChange={(e) => setModifyFormData(prev => ({ ...prev, message: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add any comments..."
                    />
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeModifyDialog}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Decision
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentificationHistory;
