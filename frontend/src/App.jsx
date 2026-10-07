import Notifications from "./pages/student/Notifications";
import Instructor from "./pages/admin/Instructor";
import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider, Button, Empty } from "./components/ui";
import { ProtectedRoute, RoleProtectedRoute } from "./routes/ProtectedRoute";
import PublicLayout from "./layouts/PublicLayout";
import StudentLayout from "./layouts/StudentLayout";
import AdminLayout from "./layouts/AdminLayout";
import Home from "./pages/public/Home";
import { Courses, CourseDetail } from "./pages/public/Courses";
import AuthPage from "./pages/public/Auth";
import {
  About,
  CertificateVerification,
  Contact,
  PublicLearningPaths,
  Pricing,
} from "./pages/public/Info";
import Dashboard from "./pages/student/Dashboard";
import { LearningPath, MyLearning, Onboarding } from "./pages/student/Learning";
import CoursePlayer from "./pages/student/CoursePlayer";
import PracticeLab, { SavedPrompts } from "./pages/student/PracticeLab";
import { Certificates, Profile, Projects } from "./pages/student/Projects";
import AdminDashboard from "./pages/admin/Dashboard";
import {
  AdminCourses,
  CourseBuilder,
  CourseEditor,
} from "./pages/admin/Courses";
import { StudentDetail, Students } from "./pages/admin/Students";
import {
  AdminEnrollments,
  AdminSupport,
  ResourceManager,
  Settings,
} from "./pages/admin/Resources";
import {
  AdminCertificates,
  AdminQuizzes,
  ProjectReviews,
} from "./pages/admin/Assessment";
function ScrollAndTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${pathname.includes("/admin") ? "Admin portal" : pathname.includes("/student") ? "Your learning journey" : "Learn AI for the way you work"} · Ai Learning Uni`;
  }, [pathname]);
  return null;
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ScrollAndTitle />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="courses" element={<Courses />} />
              <Route path="courses/:slug" element={<CourseDetail />} />
              <Route path="learning-path" element={<PublicLearningPaths />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="login" element={<AuthPage />} />
              <Route
                path="register"
                element={<AuthPage key="register" register />}
              />
              <Route
                path="certificate/:certificateId"
                element={<CertificateVerification />}
              />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<RoleProtectedRoute allowed={["student"]} />}>
                <Route path="student" element={<StudentLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="onboarding" element={<Onboarding />} />
                  <Route path="courses" element={<MyLearning />} />
                  <Route path="course/:courseId" element={<CoursePlayer />} />
                  <Route path="learning-path" element={<LearningPath />} />
                  <Route path="practice-lab" element={<PracticeLab />} />
                  <Route path="saved-prompts" element={<SavedPrompts />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="certificates" element={<Certificates />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="support" element={<Contact portal />} />
                </Route>
              </Route>
              <Route
                element={
                  <RoleProtectedRoute allowed={["admin", "superadmin"]} />
                }
              >
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="courses" element={<AdminCourses />} />
                  <Route path="courses/new" element={<CourseEditor />} />
                  <Route path="courses/:id/edit" element={<CourseEditor />} />
                  <Route
                    path="courses/:id/builder"
                    element={<CourseBuilder />}
                  />
                  <Route path="students" element={<Students />} />
                  <Route path="students/:id" element={<StudentDetail />} />
                  {[
                    "categories",
                    "learning-paths",
                    "instructors",
                    "packages",
                  ].map((kind) => (
                    <Route
                      key={kind}
                      path={kind}
                      element={<ResourceManager key={kind} kind={kind} />}
                    />
                  ))}
                  <Route path="enrollments" element={<AdminEnrollments />} />
                  <Route path="quizzes" element={<AdminQuizzes />} />
                  <Route path="projects" element={<ProjectReviews />} />
                  <Route path="certificates" element={<AdminCertificates />} />
                  <Route
                    path="analytics"
                    element={<AdminDashboard analytics />}
                  />
                  <Route path="settings" element={<Settings />} />
                  <Route path="support" element={<AdminSupport />} />
                </Route>
              </Route>
              <Route element={<RoleProtectedRoute allowed={["instructor"]} />}>
                <Route path="instructor" element={<Instructor />} />
              </Route>
            </Route>
            <Route
              path="*"
              element={
                <div className="container public-section">
                  <Empty
                    title="This path hasn’t been mapped yet"
                    description="Let’s get you back to a good starting point."
                    action={<Button to="/">Back to Ai Learning Uni</Button>}
                  />
                </div>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
