import { useAuth } from '@/contexts/AuthContext';
import Onboarding from './Onboarding';
import Home from './Home';

export default function Index() {
  const { profile, isOnboarded, updateProfile } = useAuth();

  if (!profile || !isOnboarded) {
    return (
      <Onboarding
        onComplete={async (userProfile) => {
          await updateProfile({
            group_id: userProfile.groupId,
            group_name: userProfile.groupName,
            institute: userProfile.institute,
            course: userProfile.course,
            semester: userProfile.semester,
            onboarded: true,
          });
        }}
      />
    );
  }

  const user = {
    name: profile.first_name + (profile.last_name ? ` ${profile.last_name}` : ''),
    groupId: profile.group_id || '',
    groupName: profile.group_name || '',
    institute: profile.institute || '',
    course: profile.course || 1,
    semester: profile.semester || 1,
    onboarded: true,
  };

  return <Home user={user} />;
}
