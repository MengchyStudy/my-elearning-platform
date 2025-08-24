import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { Book, LayoutDashboard, MessageCircle, PlayCircle } from 'lucide-react';

// Main App component
export default function App() {
  // Global variables provided by the Canvas environment
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  // State variables for the application
  const [currentPage, setCurrentPage] = useState('catalog'); // 'catalog', 'details', 'dashboard'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [enrolledCourses, setEnrolledCourses] = useState([
    { id: 1, title: 'Introduction to Web Development', progress: 50 },
    { id: 3, title: 'Digital Marketing Fundamentals', progress: 25 },
  ]);

  // Mock data for courses
  const courses = [
    {
      id: 1,
      title: 'Introduction to Web Development',
      description: 'Learn the fundamentals of HTML, CSS, and JavaScript to build your first website from scratch.',
      instructor: 'Jane Doe',
      rating: 4.8,
      lessons: 10,
      price: '$50',
      category: 'Programming',
      imageUrl: 'https://placehold.co/400x250/2563eb/ffffff?text=Web+Dev+Course',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?modestbranding=1&rel=0'
    },
    {
      id: 2,
      title: 'Graphic Design Masterclass',
      description: 'Master the principles of graphic design and use popular tools like Adobe Photoshop and Illustrator.',
      instructor: 'John Smith',
      rating: 4.5,
      lessons: 8,
      price: '$75',
      category: 'Design',
      imageUrl: 'https://placehold.co/400x250/f97316/ffffff?text=Design+Course',
      videoUrl: 'https://www.youtube.com/embed/z-2_1wK6N6Y?modestbranding=1&rel=0'
    },
    {
      id: 3,
      title: 'Digital Marketing Fundamentals',
      description: 'Get a comprehensive overview of digital marketing, including SEO, social media, and email marketing.',
      instructor: 'Emily White',
      rating: 4.7,
      lessons: 12,
      price: '$60',
      category: 'Marketing',
      imageUrl: 'https://placehold.co/400x250/14b8a6/ffffff?text=Marketing+Course',
      videoUrl: 'https://www.youtube.com/embed/N-y4q8E1a2U?modestbranding=1&rel=0'
    },
    {
      id: 4,
      title: 'Intro to Data Science with Python',
      description: 'Learn the basics of data analysis, visualization, and machine learning using the Python programming language.',
      instructor: 'Alex Chen',
      rating: 4.9,
      lessons: 15,
      price: '$90',
      category: 'Data Science',
      imageUrl: 'https://placehold.co/400x250/c084fc/ffffff?text=Data+Science+Course',
      videoUrl: 'https://www.youtube.com/embed/Tf3_v-R1tW4?modestbranding=1&rel=0'
    },
  ];

  // Initialize Firebase and handle authentication
  useEffect(() => {
    // Check if Firebase config is available
    if (Object.keys(firebaseConfig).length === 0) {
      console.error('Firebase configuration is not provided.');
      setIsAuthReady(true);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestoreDb);
      setAuth(firebaseAuth);

      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          // User is signed in.
          setUserId(user.uid);
        } else {
          // No user is signed in, sign in anonymously.
          await signInAnonymously(firebaseAuth);
        }
        setIsAuthReady(true);
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (e) {
      console.error('Error initializing Firebase or signing in:', e);
      setIsAuthReady(true);
    }
  }, []);

  // Set up real-time listener for comments when auth is ready
  useEffect(() => {
    if (!isAuthReady || !db) return;

    // Public collection path for collaborative data
    const commentsCollectionPath = `artifacts/${appId}/public/data/course_comments`;
    const commentsQuery = query(collection(db, commentsCollectionPath)); // Removed the 'where' clause

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const allComments = [];
      snapshot.forEach((doc) => {
        allComments.push({ id: doc.id, ...doc.data() });
      });
      // Filter comments in JavaScript to avoid Firestore index issues
      const filteredComments = allComments.filter(comment => comment.courseId === selectedCourse?.id);
      
      // Sort comments by timestamp if available
      filteredComments.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
      setComments(filteredComments);
    }, (error) => {
      console.error('Error fetching comments:', error);
    });

    return () => unsubscribe();
  }, [isAuthReady, db, selectedCourse, appId]);

  // Function to navigate to a course details page
  const navigateToDetails = (course) => {
    setSelectedCourse(course);
    setCurrentPage('details');
  };

  // Function to mark a lesson as complete (simulated progress)
  const markLessonComplete = (courseId) => {
    setEnrolledCourses(prevCourses =>
      prevCourses.map(course =>
        course.id === courseId ? { ...course, progress: Math.min(course.progress + 10, 100) } : course
      )
    );
  };

  // Function to add a new comment to Firestore
  const addComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !userId || !selectedCourse) return;

    const commentsCollectionPath = `artifacts/${appId}/public/data/course_comments`;

    try {
      await addDoc(collection(db, commentsCollectionPath), {
        text: newCommentText,
        authorId: userId,
        courseId: selectedCourse.id,
        timestamp: new Date(),
      });
      setNewCommentText('');
    } catch (e) {
      console.error('Error adding document:', e);
    }
  };

  // Course Card component
  const CourseCard = ({ course }) => (
    <div
      onClick={() => navigateToDetails(course)}
      className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-1">
      <img src={course.imageUrl} alt={course.title} className="w-full h-48 object-cover" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{course.category}</span>
          <span className="text-yellow-400 flex items-center">
            ★ {course.rating}
          </span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h3>
        <p className="text-gray-600 text-sm mb-4">{course.description.substring(0, 70)}...</p>
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-gray-900">{course.price}</span>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Enroll Now
          </button>
        </div>
      </div>
    </div>
  );

  // Main JSX structure
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">EduKhmer</h1>
          <div className="flex items-center space-x-6">
            <button onClick={() => setCurrentPage('catalog')} className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors">
              <Book size={20} />
              <span className="font-medium">Courses</span>
            </button>
            <button onClick={() => setCurrentPage('dashboard')} className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors">
              <LayoutDashboard size={20} />
              <span className="font-medium">Dashboard</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {!isAuthReady ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading platform...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Course Catalog Page */}
            {currentPage === 'catalog' && (
              <div className="space-y-8">
                <h2 className="text-3xl font-bold text-center text-gray-800">Explore Our Courses</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {courses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </div>
            )}

            {/* Course Details Page */}
            {currentPage === 'details' && selectedCourse && (
              <div className="max-w-4xl mx-auto space-y-8">
                <button onClick={() => setCurrentPage('catalog')} className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors">
                  <span className="text-xl font-bold">← Back to Courses</span>
                </button>
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">{selectedCourse.title}</h2>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
                    <iframe
                      className="w-full h-full"
                      src={selectedCourse.videoUrl}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <p className="text-gray-700 leading-relaxed mb-6">{selectedCourse.description}</p>
                      <div className="bg-gray-50 rounded-lg p-4 mb-6 border-l-4 border-blue-600">
                        <h4 className="font-bold text-gray-800">Instructor: {selectedCourse.instructor}</h4>
                        <p className="text-gray-600 text-sm">Expert in {selectedCourse.category}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-600">
                        <h4 className="font-bold text-gray-800">Course Curriculum</h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                          <li>Lesson 1: Getting Started</li>
                          <li>Lesson 2: The Basics of {selectedCourse.category}</li>
                          <li>Lesson 3: Advanced Concepts</li>
                          <li>Lesson 4: Project Work</li>
                        </ul>
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <div className="bg-blue-600 text-white p-6 rounded-lg shadow-md mb-4">
                        <span className="block text-4xl font-extrabold">{selectedCourse.price}</span>
                        <span className="block text-sm font-medium">One-time payment</span>
                        <button className="w-full mt-4 bg-white text-blue-600 py-2 rounded-lg font-bold hover:bg-blue-100 transition-colors">
                          <PlayCircle className="inline mr-2" /> Start Learning
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-gray-400">
                        <h4 className="font-bold text-gray-800">Ratings & Reviews</h4>
                        <p className="text-gray-600 text-sm">({selectedCourse.rating} out of 5 stars)</p>
                      </div>
                    </div>
                  </div>

                  {/* Discussion Forum */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-2xl font-bold mb-4 flex items-center space-x-2 text-gray-800">
                      <MessageCircle size={24} />
                      <span>Course Q&A</span>
                    </h3>
                    <div className="bg-gray-50 p-6 rounded-lg mb-6 max-h-80 overflow-y-auto space-y-4">
                      {comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center mb-2">
                              <span className="font-semibold text-sm text-blue-600 mr-2">{comment.authorId.substring(0, 8)}...</span>
                              <span className="text-xs text-gray-500">{new Date(comment.timestamp?.toMillis()).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-700">{comment.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500">No questions yet. Be the first to ask!</p>
                      )}
                    </div>
                    <form onSubmit={addComment} className="flex space-x-4">
                      <input
                        type="text"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                      >
                        Post
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Student Dashboard Page */}
            {currentPage === 'dashboard' && (
              <div className="max-w-4xl mx-auto space-y-8">
                <h2 className="text-3xl font-bold text-center text-gray-800">My Learning Dashboard</h2>
                {enrolledCourses.length > 0 ? (
                  enrolledCourses.map(course => (
                    <div key={course.id} className="bg-white rounded-xl shadow-lg p-6 flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 font-medium">Progress: {course.progress}%</span>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => markLessonComplete(course.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                      >
                        Mark Lesson Complete
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500">You have not enrolled in any courses yet.</p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-inner mt-8">
        <div className="container mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          &copy; 2025 EduKhmer. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
