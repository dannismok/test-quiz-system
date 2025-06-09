// API Base URL
const apiBaseUrl = "http://localhost:5000/api";

// Utility function to make API requests
async function makeApiRequest(endpoint, method = "GET", body = null) {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4Mzk1ZmUxNWRhZTVkZDQ5NmM3MTQ2ZCIsInVzZXJuYW1lIjoiUGV0ZXIiLCJpYXQiOjE3NDg3NDg4NzYsImV4cCI6MTc0ODc1MjQ3Nn0.AwB88zwuTSO177kZTQrgy_8n8CuOxgS1waV3ccieobw";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    return { error: error.message };
  }
}

// Manage Users
document.getElementById("fetchUsers").addEventListener("click", async () => {
  const data = await makeApiRequest("/users");
  document.getElementById("usersOutput").innerText = JSON.stringify(data, null, 2);
});

document.getElementById("createUser").addEventListener("click", async () => {
  const userData = { username: "newuser", email: "newuser@example.com" };
  const data = await makeApiRequest("/users", "POST", userData);
  document.getElementById("usersOutput").innerText = JSON.stringify(data, null, 2);
});

// Manage Courses
document.getElementById("fetchCourses").addEventListener("click", async () => {
  const data = await makeApiRequest("/courses");
  document.getElementById("coursesOutput").innerText = JSON.stringify(data, null, 2);
});

document.getElementById("createCourse").addEventListener("click", async () => {
  const courseData = { title: "New Course", description: "Course Description" };
  const data = await makeApiRequest("/courses", "POST", courseData);
  document.getElementById("coursesOutput").innerText = JSON.stringify(data, null, 2);
});

// Manage Subscriptions
document.getElementById("fetchSubscriptions").addEventListener("click", async () => {
  const data = await makeApiRequest("/subscriptions");
  document.getElementById("subscriptionsOutput").innerText = JSON.stringify(data, null, 2);
});

document.getElementById("createSubscription").addEventListener("click", async () => {
  const subscriptionData = { userId: "68395fe15dae5dd496c7146d", courseId: "683b178d635b29f5d63f21cf" };
  const data = await makeApiRequest("/subscriptions", "POST", subscriptionData);
  document.getElementById("subscriptionsOutput").innerText = JSON.stringify(data, null, 2);
});