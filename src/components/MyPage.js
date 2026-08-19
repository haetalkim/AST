import React, { useEffect, useMemo, useState } from 'react';
import { User, Edit2, Save, X } from 'lucide-react';
import { getMe, getRoster, changePassword, updateMyProfile, setWorkspaceSchool } from '../api/auth';
import { getSchools } from '../api/schools';
import { periodsFromClassStructure } from '../utils/classStructure';
import SchoolCombobox from './SchoolCombobox';
import Button from './ui/Button';
import Card from './ui/Card';

const MyPage = ({
  workspaceId,
  userRole,
  viewerProfile,
  filters,
  setFilters,
  theme,
  onLogout,
  classStructure,
  onProfileSaved,
  focusSchoolSignal = 0,
  schoolEditable = false, // teacher of a class workspace: the school is a per-class setting
  memberships = [],
  switchWorkspace,
  workspaceFullName,
}) => {
  const isTeacherRole = userRole === 'teacher';
  const [isEditing, setIsEditing] = useState(false);
  const [tempFilters, setTempFilters] = useState({ ...filters });
  const [groupMembers, setGroupMembers] = useState([]);
  const [instructor, setInstructor] = useState({ name: '', role: 'Instructor', id: '' });
  const [me, setMe] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordEmail, setPasswordEmail] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [profileSaveBusy, setProfileSaveBusy] = useState(false);
  const [schoolInput, setSchoolInput] = useState(viewerProfile.school || filters.school || '');
  const [schoolBusy, setSchoolBusy] = useState(false);
  const [schoolError, setSchoolError] = useState('');
  const [schoolSaved, setSchoolSaved] = useState(false);
  const [schoolOptions, setSchoolOptions] = useState([]);

  const profileInitials = () => {
    const name = (viewerProfile.displayName || me?.user?.full_name || '').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
    return isTeacherRole ? 'IN' : 'ST';
  };

  useEffect(() => {
    let cancelled = false;
    async function loadRoster() {
      if (!workspaceId) return;
      try {
        const [meData, rosterData] = await Promise.all([getMe(), getRoster(workspaceId)]);
        if (cancelled) return;
        setMe(meData);
        const members = rosterData.members || [];
        const teacher = members.find((m) => m.role === 'teacher');
        const students = members.filter((m) => m.role === 'student');
        if (teacher) {
          setInstructor({
            name: teacher.full_name,
            role: 'Instructor',
            id: teacher.student_code || teacher.email,
          });
        }
        const apiStudents = students.map((s) => {
          const email = String(s.email || '').trim();
          const code = String(s.student_code || '').trim();
          // Prefer full email when it has a domain; bare local-parts (no @) are labeled clearly.
          let contact = email;
          if (email && !email.includes('@')) {
            contact = `${email} (no domain)`;
          } else if (!email && code) {
            contact = code.includes('@') ? code : `${code} (no domain)`;
          } else if (!email) {
            contact = '—';
          }
          return {
            name: s.full_name || (email.includes('@') ? email.split('@')[0] : email) || code || 'Student',
            role: `${s.period || 'P?'} · ${s.group_code || 'G?'}`,
            contact,
            studentCode: code,
            email,
          };
        });
        setGroupMembers(apiStudents);
      } catch {
        // keep existing static fallback when API unavailable
      }
    }
    loadRoster();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Load the saved school into the editable field; updates after a save/profile sync.
  // filters.school is intentionally omitted from deps to avoid clobbering the input while typing.
  useEffect(() => {
    setSchoolInput(viewerProfile.school || filters.school || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerProfile.school]);

  // Pull the internal school directory for the picker (only a class teacher edits the school).
  useEffect(() => {
    if (!schoolEditable) return undefined;
    let cancelled = false;
    getSchools()
      .then((data) => {
        if (!cancelled) setSchoolOptions(data.schools || []);
      })
      .catch(() => {
        // Directory unavailable — nothing to pick from.
      });
    return () => {
      cancelled = true;
    };
  }, [schoolEditable]);

  // When navigated here via the Manage Classes "Edit" link, scroll to and focus the school field.
  useEffect(() => {
    if (!focusSchoolSignal) return;
    const raf = requestAnimationFrame(() => {
      const section = document.getElementById('school-setting');
      const input = document.getElementById('school-input');
      section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [focusSchoolSignal]);

  const periodEditOptions = useMemo(() => {
    const p = periodsFromClassStructure(classStructure);
    if (p.length) return p;
    return ['P1', 'P2', 'P3', 'P4'];
  }, [classStructure]);

  const groupEditNums = useMemo(() => {
    const n =
      typeof classStructure?.groupCount === 'number' && classStructure.groupCount > 0
        ? classStructure.groupCount
        : 6;
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [classStructure]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (!passwordEmail.trim() || !passwordNew || passwordNew.length < 8) {
      setPasswordError('Use your account email and a new password (at least 8 characters).');
      return;
    }
    try {
      setPasswordBusy(true);
      await changePassword(passwordEmail.trim().toLowerCase(), passwordNew);
      setShowPasswordModal(false);
      setPasswordNew('');
      onLogout();
    } catch (err) {
      setPasswordError(err.message || 'Could not update password.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const groupedStructure = useMemo(() => {
    const map = {};
    groupMembers.forEach((m) => {
      const parts = String(m.role).split('•').map((p) => p.trim());
      const period = parts[0] || 'P?';
      const group = parts[1] || 'G?';
      const key = `${period} ${group}`;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [groupMembers]);

  const handleSave = async () => {
    setProfileSaveError('');
    setProfileSaveBusy(true);
    try {
      await updateMyProfile(workspaceId, {
        schoolCode: tempFilters.school,
        instructor: tempFilters.instructor,
        period: tempFilters.period,
        groupCode: tempFilters.group,
      });
      setFilters(tempFilters);
      setIsEditing(false);
      await onProfileSaved?.();
    } catch (e) {
      setProfileSaveError(e.message || 'Could not save profile.');
    } finally {
      setProfileSaveBusy(false);
    }
  };

  const handleCancel = () => {
    setTempFilters({ ...filters });
    setIsEditing(false);
  };

  const handleSaveSchool = async () => {
    setSchoolError('');
    setSchoolSaved(false);
    const value = schoolInput.trim();
    // School now maps a class to its school workspace, so it must be a directory entry (not free text).
    const match = schoolOptions.find((s) => s.name.toLowerCase() === value.toLowerCase());
    if (!match) {
      setSchoolError('Pick a school from the list.');
      return;
    }
    setSchoolBusy(true);
    try {
      await setWorkspaceSchool(workspaceId, match.id);
      setFilters({ ...filters, school: match.name });
      setSchoolSaved(true);
      await onProfileSaved?.();
    } catch (e) {
      setSchoolError(e.message || 'Could not save school.');
    } finally {
      setSchoolBusy(false);
    }
  };

  // Detach the class from its school: members leave the school workspace and its data stops
  // surfacing there (they keep Public). This is the school-less / general-user state.
  const handleRemoveSchool = async () => {
    setSchoolError('');
    setSchoolSaved(false);
    setSchoolBusy(true);
    try {
      await setWorkspaceSchool(workspaceId, null);
      setSchoolInput('');
      setFilters({ ...filters, school: '' });
      setSchoolSaved(true);
      await onProfileSaved?.();
    } catch (e) {
      setSchoolError(e.message || 'Could not remove school.');
    } finally {
      setSchoolBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page__head">
        <h1 className="text-page text-fg">My page</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Profile Card */}
        <div className="space-y-6">
          <Card className="text-center">
            <div className="w-22 h-22 mx-auto rounded-full flex items-center justify-center text-3xl font-semibold bg-fg text-on-primary mb-4" style={{ width: 88, height: 88 }}>
              {profileInitials()}
            </div>
            <h2 className="text-tile text-fg">
              {isTeacherRole
                ? viewerProfile.displayName || me?.user?.full_name || 'Instructor'
                : viewerProfile.displayName || me?.user?.full_name || viewerProfile.studentId || filters.studentId || 'Student'}
            </h2>
            <p className="text-small text-muted mt-1">
              {isTeacherRole
                ? `${viewerProfile.school || filters.school} • ${viewerProfile.instructor || filters.instructor || 'Instructor'}`
                : `${viewerProfile.school || filters.school} - ${viewerProfile.instructor || filters.instructor} - ${viewerProfile.period || filters.period} - Group ${(viewerProfile.group || filters.group || '').replace('G', '')}`}
            </p>

            <hr className="hr my-4 border-hairline-soft" />

            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between text-small">
                <span className="text-muted">Country</span>
                <span className="text-fg">{filters.country}</span>
              </div>
              <div className="flex items-center justify-between text-small">
                <span className="text-muted">State</span>
                <span className="text-fg">{filters.state}</span>
              </div>
              <div className="flex items-center justify-between text-small">
                <span className="text-muted">School Code</span>
                <span className="text-fg">{viewerProfile.school || filters.school}</span>
              </div>
              <div className="flex items-center justify-between text-small">
                <span className="text-muted">Class (Instructor)</span>
                <span className="text-fg">{viewerProfile.instructor || filters.instructor}</span>
              </div>
              <div className="flex items-center justify-between text-small">
                <span className="text-muted">Period</span>
                <span className="text-fg">{viewerProfile.period || filters.period}</span>
              </div>
              <div className="flex items-center justify-between text-small">
                <span className="text-muted">Group</span>
                <span className="text-fg">{viewerProfile.group || filters.group}</span>
              </div>
            </div>

            <Button
              wide
              className="mt-6"
              onClick={() => {
                setTempFilters({ ...filters });
                setProfileSaveError('');
                setIsEditing(true);
              }}
            >
              <Edit2 className="w-4 h-4" />
              Edit profile
            </Button>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-tile text-fg mb-4">Quick actions</h3>
            <div className="space-y-2">
              <Button variant="neutral" size="sm" wide className="justify-start">
                Help and support
              </Button>
              <Button variant="neutral" size="sm" wide className="justify-start">
                Privacy settings
              </Button>
              <Button variant="danger" size="sm" wide className="justify-start" onClick={onLogout}>
                Sign out
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-tile text-fg mb-3">
              {userRole === 'teacher' ? 'Teacher Guide' : 'Student Guide'}
            </h3>
            {(userRole === 'teacher') ? (
              <ul className="text-small text-secondary space-y-2">
                <li>Start in Manage Classes to confirm period/group structure.</li>
                <li>Use HeatMap for class-level overview, then Raw Data for detailed validation.</li>
                <li>Review student annotation asterisks (*) before exporting reports.</li>
              </ul>
            ) : (
              <ul className="text-small text-secondary space-y-2">
                <li>Start in HeatMap to understand current conditions.</li>
                <li>Use Raw Data to review measurements and add responsible edit notes.</li>
                <li>Use Analysis to summarize trends and add reflection insights.</li>
              </ul>
            )}
          </Card>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Account Settings */}
          <Card>
            <h3 className="text-tile text-fg">Account</h3>
            <p className="text-small text-muted mt-1">The same in every workspace.</p>

            <div className="space-y-4 mt-5">
              {schoolEditable && (
                <div id="school-setting">
                  <label htmlFor="school-input" className="block text-small font-semibold text-secondary mb-2">
                    School
                  </label>
                  <div className="flex gap-2">
                    <SchoolCombobox
                      id="school-input"
                      value={schoolInput}
                      onChange={(v) => { setSchoolInput(v); setSchoolSaved(false); }}
                      options={schoolOptions.map((s) => s.name)}
                      placeholder="Search or select your school"
                      inputClassName="w-full h-11 px-4 border border-hairline rounded-ctrl bg-surface text-fg text-body focus:outline-none focus:border-link focus:ring-4 focus:ring-[rgba(0,102,204,0.15)]"
                    />
                    <Button size="sm" className="shrink-0" onClick={handleSaveSchool} disabled={schoolBusy}>
                      {schoolBusy ? 'Saving…' : 'Save'}
                    </Button>
                    {(viewerProfile.school || filters.school) && (
                      <Button size="sm" variant="danger" className="shrink-0" onClick={handleRemoveSchool} disabled={schoolBusy}>
                        Remove
                      </Button>
                    )}
                  </div>
                  {schoolError ? (
                    <p className="text-cap text-aqi-unhealthy mt-1">{schoolError}</p>
                  ) : schoolSaved ? (
                    <p className="text-cap text-aqi-good mt-1">
                      {(viewerProfile.school || filters.school)
                        ? 'School saved. Everyone in this class now shares its school workspace.'
                        : 'School removed. This class is no longer part of a school workspace.'}
                    </p>
                  ) : (
                    <p className="text-cap text-muted mt-1">
                      Sets the school for this whole class — its members join the school workspace and its data reaches other classes at this school. Use Remove to detach it.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-small font-semibold text-secondary mb-2">
                  {isTeacherRole ? 'Instructor / staff ID' : 'Student ID'}
                </label>
                <input
                  type="text"
                  value={
                    isTeacherRole
                      ? viewerProfile.studentId || filters.studentId || me?.user?.email || '—'
                      : filters.studentId
                  }
                  disabled
                  className="w-full h-11 px-4 bg-canvas border border-hairline-soft rounded-ctrl text-muted cursor-not-allowed"
                />
                <p className="text-cap text-muted mt-1">
                  {isTeacherRole ? 'Shown for your records; edit placement in Manage Classes for students.' : 'Student ID cannot be changed'}
                </p>
              </div>

              <div>
                <label className="block text-small font-semibold text-secondary mb-2">Email address</label>
                <input
                  type="email"
                  value={me?.user?.email || ''}
                  disabled
                  className="w-full h-11 px-4 bg-canvas border border-hairline-soft rounded-ctrl text-muted cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-small font-semibold text-secondary mb-2">Password</label>
                <Button
                  variant="neutral"
                  wide
                  className="justify-start"
                  onClick={() => {
                    setPasswordError('');
                    setPasswordNew('');
                    setPasswordEmail(me?.user?.email || '');
                    setShowPasswordModal(true);
                  }}
                >
                  Change password
                </Button>
              </div>
            </div>
          </Card>

          {/* Your workspaces */}
          {memberships.length > 0 && (
            <Card>
              <h3 className="text-tile text-fg">Your workspaces</h3>
              <p className="text-small text-muted mt-1">Switch between the classes and views you belong to.</p>
              <div className="tablewrap border border-hairline-soft rounded-card overflow-hidden mt-4">
                <table className="w-full text-small">
                  <tbody className="divide-y divide-hairline-soft">
                    {memberships.map((m) => {
                      const active = m.workspace_id === workspaceId;
                      const name = workspaceFullName ? workspaceFullName(m) : m.workspace_name || 'Workspace';
                      const roleLabel = m.role === 'teacher' ? 'Instructor' : 'Student';
                      const placement = [m.profile?.period, m.profile?.group_code].filter(Boolean).join(' · ');
                      return (
                        <tr key={m.workspace_id} className={active ? 'bg-canvas' : undefined}>
                          <td className="py-3 px-3.5">
                            <button
                              type="button"
                              onClick={() => switchWorkspace?.(m.workspace_id)}
                              disabled={active}
                              className={`font-medium ${active ? 'text-fg cursor-default' : 'text-link hover:underline'}`}
                            >
                              {name}
                            </button>
                            {placement ? <div className="text-cap text-muted mt-0.5">{placement}</div> : null}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <span className="tag inline-block px-2.5 py-0.5 text-cap rounded-pill bg-canvas text-secondary border border-hairline">
                              {roleLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Group Members */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 ${theme.bg} rounded-ctrl flex items-center justify-center`}>
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-tile text-fg">
                {(userRole === 'teacher') ? 'Class Members' : 'Group Members'}
              </h3>
            </div>

            {/* Instructor */}
            <div className="mb-6 pb-6 border-b border-hairline-soft">
              <p className="text-cap font-semibold text-muted uppercase tracking-wider mb-3">Instructor</p>
              <div className="flex items-center gap-3 p-3 bg-canvas rounded-ctrl border border-hairline-soft">
                <User className="w-6 h-6 text-secondary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-fg">
                    {instructor.name || viewerProfile.instructor || filters.instructor || '—'}
                  </p>
                  <p className="text-small text-secondary">{instructor.role}</p>
                </div>
                <span className="text-cap text-muted font-mono">{instructor.id || '—'}</span>
              </div>
            </div>

            {/* Students */}
            <div>
              <p className="text-cap font-semibold text-muted uppercase tracking-wider mb-3">
                Students by Period and Group
              </p>
              <div className="space-y-4">
                {Object.keys(groupedStructure).map((bucket) => (
                  <div key={bucket}>
                    <p className="text-cap font-bold text-muted mb-2">{bucket}</p>
                    <div className="space-y-2">
                      {groupedStructure[bucket].map((member, idx) => (
                        <div key={`${bucket}-${idx}`} className="flex items-center gap-3 p-3 hover:bg-canvas rounded-ctrl transition-colors">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-fg text-on-primary font-semibold text-small">
                            {member.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-fg truncate">{member.name}</p>
                            <p className="text-small text-secondary">{member.role}</p>
                          </div>
                          <span
                            className="max-w-[11rem] truncate text-cap text-muted font-mono"
                            title={member.contact}
                          >
                            {member.contact}
                          </span>
                          {(
                            (member.studentCode && member.studentCode === (viewerProfile.studentId || filters.studentId))
                            || (member.email && me?.user?.email && member.email.toLowerCase() === String(me.user.email).toLowerCase())
                          ) && (
                            <span className="px-2 py-0.5 rounded-pill text-cap font-semibold border border-hairline bg-canvas text-link">
                              You
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* About */}
          <Card flat>
            <h3 className="text-tile text-fg mb-4">About Air Story</h3>
            <div className="space-y-3 text-small text-secondary">
              <p>
                <strong className="text-fg">Version:</strong> 1.0.0
              </p>
              <p>
                <strong className="text-fg">Last Updated:</strong> June 25, 2026
              </p>
              <p>
                Air Story is a comprehensive air quality monitoring platform designed for schools and communities.
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <button type="button" className="text-link hover:underline font-medium bg-transparent border-0 p-0 cursor-pointer">
                  Terms of Service
                </button>
                <button type="button" className="text-link hover:underline font-medium bg-transparent border-0 p-0 cursor-pointer">
                  Privacy Policy
                </button>
                <button type="button" className="text-link hover:underline font-medium bg-transparent border-0 p-0 cursor-pointer">
                  Contact
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleCancel}>
          <div className="bg-surface rounded-card max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={`${theme.bg} text-white p-6 rounded-t-[18px] flex items-center justify-between`}>
              <h3 className="text-tile">Edit profile</h3>
              <button onClick={handleCancel} className="p-1 hover:bg-white/20 rounded-ctrl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-small font-semibold text-secondary mb-2">Country</label>
                <select
                  value={tempFilters.country}
                  onChange={(e) => setTempFilters({ ...tempFilters, country: e.target.value })}
                  className="w-full h-11 px-4 border border-hairline rounded-ctrl bg-surface text-fg focus:outline-none focus:border-link focus:ring-4 focus:ring-[rgba(0,102,204,0.15)]"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="UK">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>

              <div>
                <label className="block text-small font-semibold text-secondary mb-2">State/Province</label>
                <select
                  value={tempFilters.state}
                  onChange={(e) => setTempFilters({ ...tempFilters, state: e.target.value })}
                  className="w-full h-11 px-4 border border-hairline rounded-ctrl bg-surface text-fg focus:outline-none focus:border-link focus:ring-4 focus:ring-[rgba(0,102,204,0.15)]"
                >
                  <option value="">Not set</option>
                  <option value="PA">Pennsylvania</option>
                  <option value="NY">New York</option>
                  <option value="CA">California</option>
                  <option value="TX">Texas</option>
                  <option value="FL">Florida</option>
                </select>
              </div>

              <div>
                <label className="block text-small font-semibold text-secondary mb-2">School Code</label>
                <input
                  type="text"
                  value={tempFilters.school}
                  onChange={(e) => setTempFilters({ ...tempFilters, school: e.target.value })}
                  className="w-full h-11 px-4 border border-hairline rounded-ctrl bg-surface text-fg focus:outline-none focus:border-link focus:ring-4 focus:ring-[rgba(0,102,204,0.15)]"
                />
              </div>

              <div>
                <label className="block text-small font-semibold text-secondary mb-2">Class (Instructor)</label>
                <input
                  type="text"
                  value={tempFilters.instructor}
                  onChange={(e) => setTempFilters({ ...tempFilters, instructor: e.target.value })}
                  className="w-full h-11 px-4 border border-hairline rounded-ctrl bg-surface text-fg focus:outline-none focus:border-link focus:ring-4 focus:ring-[rgba(0,102,204,0.15)]"
                />
              </div>

              <div>
                <label className="block text-small font-semibold text-secondary mb-2">Period</label>
                <select
                  value={tempFilters.period || periodEditOptions[0] || 'P1'}
                  onChange={(e) => setTempFilters({ ...tempFilters, period: e.target.value })}
                  className="w-full h-11 px-4 border border-hairline rounded-ctrl bg-surface text-fg focus:outline-none focus:border-link focus:ring-4 focus:ring-[rgba(0,102,204,0.15)]"
                >
                  {periodEditOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-small font-semibold text-secondary mb-2">Group</label>
                <div className="grid grid-cols-3 gap-2">
                  {groupEditNums.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTempFilters({ ...tempFilters, group: `G${num}` })}
                      className={`py-2 rounded-ctrl text-small font-medium transition-all ${
                        tempFilters.group === `G${num}`
                          ? `${theme.bg} text-white`
                          : 'bg-canvas text-secondary hover:bg-hairline-soft'
                      }`}
                    >
                      G{num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {profileSaveError ? (
              <div className="px-6 pb-2">
                <p className="text-small text-aqi-unhealthy">{profileSaveError}</p>
              </div>
            ) : null}
            <div className="p-6 border-t border-hairline-soft flex gap-3">
              <Button variant="neutral" wide onClick={handleCancel} disabled={profileSaveBusy}>
                Cancel
              </Button>
              <Button wide onClick={handleSave} disabled={profileSaveBusy}>
                <Save className="w-4 h-4" />
                {profileSaveBusy ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !passwordBusy && setShowPasswordModal(false)}
        >
          <div
            className="bg-surface rounded-card max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`${theme.bg} text-white p-6 rounded-t-[18px] flex items-center justify-between`}>
              <h3 className="text-tile">Change password</h3>
              <button
                type="button"
                onClick={() => !passwordBusy && setShowPasswordModal(false)}
                className="p-1 hover:bg-white/20 rounded-ctrl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              <p className="text-small text-secondary">
                Confirm your email and choose a new password. You will be signed out and can log in again.
              </p>
              <div>
                <label className="block text-small font-semibold text-secondary mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={passwordEmail}
                  onChange={(e) => setPasswordEmail(e.target.value)}
                  className="w-full h-11 px-4 border border-hairline rounded-ctrl bg-surface text-fg focus:outline-none focus:border-link focus:ring-4 focus:ring-[rgba(0,102,204,0.15)]"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-small font-semibold text-secondary mb-2">New password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  className="w-full h-11 px-4 border border-hairline rounded-ctrl bg-surface text-fg focus:outline-none focus:border-link focus:ring-4 focus:ring-[rgba(0,102,204,0.15)]"
                  autoComplete="new-password"
                />
              </div>
              {passwordError ? <p className="text-small text-aqi-unhealthy">{passwordError}</p> : null}
              <Button type="submit" wide disabled={passwordBusy}>
                {passwordBusy ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;