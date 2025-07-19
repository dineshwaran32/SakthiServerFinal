import mongoose from 'mongoose';
import User from './models/User.js'; // Assuming your schema is in models/User.js

// Connect to MongoDB
mongoose.connect('mongodb+srv://vithack28:vithack28@cluster0.cq6gr.mongodb.net/Kaizen_Idea?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ Connected to MongoDB');

  try {
    const users = await User.findOne({ employeeNumber: '4545' }); // Retrieve all users
    console.log('📄 All Users:', users);
  } catch (err) {
    console.error('❌ Error fetching users:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }

})
.catch(err => {
  console.error('❌ Connection error:', err);
});
