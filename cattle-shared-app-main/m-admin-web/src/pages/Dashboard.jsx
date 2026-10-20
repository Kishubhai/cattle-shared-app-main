import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mAdminAPI, dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { admin, logout } = useAuth();

  const [pendingCattle, setPendingCattle] = useState([]);
  const [mlFailedCattle, setMLFailedCattle] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [mlRegisteringId, setMLRegisteringId] = useState(null);
  const [manualApprovingId, setManualApprovingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [cattleResponse, statsResponse, mlFailedResponse] = await Promise.all([
        mAdminAPI.getPendingCattle({ page, limit: 20 }),
        dashboardAPI.getStats(),
        mAdminAPI.getMLFailedCattle({ page: 1, limit: 10 }),
      ]);

      if (cattleResponse.success) {
        setPendingCattle(cattleResponse.data.cattle);
        setPagination(cattleResponse.data.pagination);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (mlFailedResponse.success) {
        setMLFailedCattle(mlFailedResponse.data.cattle);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMLRegister = async (cattleId, mongoId) => {
    setMLRegisteringId(mongoId);
    try {
      const result = await mAdminAPI.manualMLRegisterCattle(mongoId);
      if (result.success) {
        setMLFailedCattle(prev => prev.filter(c => c._id !== mongoId));
        alert(`✅ Cattle ${cattleId} successfully registered in AI system`);
      } else {
        alert('❌ AI registration failed. Please try again later.');
      }
    } catch (err) {
      alert('❌ AI registration failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setMLRegisteringId(null);
    }
  };

  const handleManualApprove = async (cattleId, mongoId) => {
    if (!window.confirm(`Manually approve cattle ${cattleId} without AI verification?`)) return;
    setManualApprovingId(mongoId);
    try {
      const result = await mAdminAPI.manuallyApproveCattle(mongoId);
      if (result.success) {
        setMLFailedCattle(prev => prev.filter(c => c._id !== mongoId));
        alert(`✅ Cattle ${cattleId} manually approved`);
      }
    } catch (err) {
      alert('❌ Approval failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setManualApprovingId(null);
    }
  };

  const handleVerify = (cattleId) => {
    navigate(`/verify/${cattleId}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading && !pendingCattle.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">M_Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {admin?.firstName} {admin?.lastName}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigate('/identification-requests')}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-6 text-left transition shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">🔍 Cattle Identification</h3>
                <p className="text-purple-100 text-sm">
                  Process farmer cattle identification requests
                </p>
              </div>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-6 text-left transition shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">📋 Cattle Registration</h3>
                <p className="text-indigo-100 text-sm">
                  Verify new cattle registration submissions
                </p>
              </div>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => navigate('/verification-history')}
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-6 text-left transition shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">📚 Verification History</h3>
                <p className="text-green-100 text-sm">
                  View and modify cattle verification decisions
                </p>
              </div>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => navigate('/identification-history')}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg p-6 text-left transition shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">🗂️ Identification History</h3>
                <p className="text-teal-100 text-sm">
                  View and modify identification decisions
                </p>
              </div>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <>
            {/* Primary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <StatCard
                title="Pending Verification"
                value={stats.roleSpecific?.pendingVerification || 0}
                subtitle="Awaiting your review"
                color="yellow"
                icon="⏳"
              />
              <StatCard
                title="Today's Verifications"
                value={stats.roleSpecific?.todayVerifications || 0}
                subtitle="Completed today"
                color="blue"
                icon="📅"
              />
              <StatCard
                title="Approved"
                value={stats.roleSpecific?.approved || 0}
                subtitle="All time approved"
                color="green"
                icon="✅"
              />
              <StatCard
                title="Rejected"
                value={stats.roleSpecific?.rejected || 0}
                subtitle="All time rejected"
                color="red"
                icon="❌"
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Verified"
                value={stats.roleSpecific?.totalVerifications || 0}
                subtitle="Lifetime verifications"
                color="indigo"
                icon="📊"
              />
              <StatCard
                title="Total Cattle"
                value={stats.overview?.totalCattle || 0}
                subtitle="In system"
                color="purple"
                icon="🐄"
              />
              <StatCard
                title="Total Farmers"
                value={stats.overview?.totalUsers || 0}
                subtitle="Registered users"
                color="pink"
                icon="👥"
              />
              <StatCard
                title="AI Registration Issues"
                value={mlFailedCattle.length}
                subtitle="Retrying or needs action"
                color="orange"
                icon="⚠️"
              />
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ML Registration Failed Section */}
        {mlFailedCattle.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-orange-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-orange-900">
                  ⚠️ AI Registration Issues ({mlFailedCattle.length})
                </h2>
                <p className="text-sm text-orange-700 mt-1">
                  Cattle whose AI registration failed. Auto-retry runs every 30 min — you can also send to AI or approve manually now.
                </p>
              </div>
            </div>
            <div className="divide-y divide-orange-100">
              {mlFailedCattle.map((cattle) => {
                const isRetrying = cattle.mlRegistration?.status === 'in_progress';
                return (
                <div key={cattle._id} className="p-6 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-base font-semibold text-gray-900">
                        {cattle.cattleId || cattle.temporaryId}
                      </h3>
                      {isRetrying ? (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full font-medium">
                          🔄 Auto-Retrying
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full font-medium">
                          ❌ Retries Exhausted
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-0.5">
                      <p>Farmer: <span className="font-medium">{cattle.owner?.firstName} {cattle.owner?.lastName}</span></p>
                      <p>Breed: {cattle.breed} | Age: {cattle.age} years</p>
                      <p>Location: {cattle.location?.district}, {cattle.location?.state}</p>
                      <p>Retries: {cattle.mlRegistration?.retryCount || 0}/4 failed</p>
                    </div>
                  </div>
                  <div className="ml-6 flex flex-col gap-2">
                    <button
                      onClick={() => handleMLRegister(cattle.cattleId, cattle._id)}
                      disabled={mlRegisteringId === cattle._id || manualApprovingId === cattle._id}
                      className="px-5 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {mlRegisteringId === cattle._id ? 'Sending to AI...' : '🤖 Send to AI'}
                    </button>
                    <button
                      onClick={() => handleManualApprove(cattle.cattleId, cattle._id)}
                      disabled={manualApprovingId === cattle._id || mlRegisteringId === cattle._id}
                      className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {manualApprovingId === cattle._id ? 'Approving...' : '✅ Manually Approve'}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Cattle List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Cattle Verification ({pagination?.total || 0})
            </h2>
          </div>

          {pendingCattle.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Pending Verifications
              </h3>
              <p className="text-gray-600">All cattle have been verified!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingCattle.map((cattle) => (
                <CattleCard
                  key={cattle._id}
                  cattle={cattle}
                  onVerify={handleVerify}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.pages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, color, icon }) => {
  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    purple: 'bg-purple-100 text-purple-800',
    pink: 'bg-pink-100 text-pink-800',
    orange: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`text-4xl p-4 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Cattle Card Component
const CattleCard = ({ cattle, onVerify }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = cattle.isOverdue;
  const requestType = cattle.requestType || 'verification';

  return (
    <div className={`p-6 hover:bg-gray-50 transition ${isOverdue ? 'bg-red-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {cattle.temporaryId || cattle.cattleId}
            </h3>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              requestType === 'verification'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-purple-100 text-purple-800'
            }`}>
              {requestType === 'verification' ? '🔍 Verification' : '🔎 Identification'}
            </span>
            {isOverdue && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                ⚠️ Overdue
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-600 font-medium">Farmer:</span>
              <p className="text-gray-900 font-semibold">
                {cattle.owner?.firstName} {cattle.owner?.lastName}
              </p>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Phone:</span>
              <p className="text-gray-900">{cattle.owner?.mobileNumber || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Breed:</span>
              <p className="text-gray-900">{cattle.breed}</p>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Age:</span>
              <p className="text-gray-900">{cattle.age} years</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 font-medium">Location:</span>
              <p className="text-gray-900">
                {cattle.location?.district}, {cattle.location?.state}
              </p>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Submitted:</span>
              <p className="text-gray-900">
                {formatDate(cattle.verification?.submittedAt)}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onVerify(cattle._id)}
          className="ml-6 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-lg hover:shadow-xl"
        >
          Review & Verify
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
