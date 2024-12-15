import { Collection, ObjectId } from "mongodb";
import { courseModel, studentModel, teacherModel } from "./types.ts";

type Context = {
    StudentsCollection: Collection<studentModel>,
    TeachersCollection: Collection<teacherModel>,
    CoursesCollection: Collection<courseModel>
}

export const resolvers = {
    Query: {
        students: async (_: unknown, __: unknown, ctx: Context): Promise<studentModel[]> => {return await ctx.StudentsCollection.find().toArray()},
        student : async (_: unknown, args : {id: string}, ctx: Context): Promise<studentModel|null> => {
            const studentDB = await ctx.StudentsCollection.findOne({_id: new ObjectId(args.id)});
            if (!studentDB) return null;
            return studentDB;
        },
        teachers: async (_: unknown, __: unknown, ctx: Context): Promise<teacherModel[]> => {return await ctx.TeachersCollection.find().toArray()},
        teacher : async (_: unknown, args : {id: string}, ctx: Context): Promise<teacherModel|null> => {
            const teacherDB = await ctx.TeachersCollection.findOne({_id: new ObjectId(args.id)});
            if (!teacherDB) return null;
            return teacherDB;
        },
        courses: async (_: unknown, __: unknown, ctx: Context): Promise<courseModel[]> => {return await ctx.CoursesCollection.find().toArray()},
        course : async (_: unknown, args : {id: string}, ctx: Context): Promise<courseModel|null> => {
            const courseDB = await ctx.CoursesCollection.findOne({_id: new ObjectId(args.id)});
            if (!courseDB) return null;
            return courseDB;
        },
    },
    Mutation: {
        createStudent: async (_: unknown, args: { name: string, email: string}, ctx: Context): Promise<studentModel> => {
            const { insertedId } = await ctx.StudentsCollection.insertOne({...args, enrolledCourses: []});
            return {
                _id: insertedId,
                ...args,
                enrolledCourses: [],
            };
        },
        createTeacher: async (_: unknown, args: { name: string, email: string}, ctx: Context): Promise<teacherModel> => {
            const { insertedId } = await ctx.TeachersCollection.insertOne({...args, coursesTaught: []});
            return {
                _id: insertedId,
                ...args,
                coursesTaught: [],
            }
        },
        createCourse: async (_: unknown, args: { title: string, description: string, teacherId: string}, ctx: Context): Promise<courseModel> => {
            const teacher = await ctx.TeachersCollection.findOne({_id: new ObjectId(args.teacherId)});
            if (!teacher) throw new Error("Teacher Id not found");
            const { insertedId } = await ctx.CoursesCollection.insertOne({
                title: args.title,
                description: args.description,
                teacherId: new ObjectId(args.teacherId),
                studentIds: [],
            });
            return {
                _id: insertedId,
                title: args.title,
                description: args.description,
                teacherId: new ObjectId(args.teacherId),
                studentIds: [],
            };
        },
        deleteStudent: async (_: unknown, args: {id: string}, ctx: Context): Promise<boolean> => {
            const studentModel = await ctx.StudentsCollection.findOneAndDelete({_id: new ObjectId(args.id)});
            if (!studentModel) return false;
            await ctx.CoursesCollection.updateMany({studentIds: new ObjectId(args.id)},{ $pull: {studentIds: new ObjectId(args.id)}});
            return true;
        },
        deleteTeacher: async (_:unknown, args: {id:string}, ctx: Context): Promise<boolean> => {
            const myTeacher = await ctx.TeachersCollection.findOneAndDelete({_id:new ObjectId(args.id)});
            if(!myTeacher) return false;
            await ctx.CoursesCollection.updateMany({teacherId: new ObjectId(args.id)},{ $set: {teacherId : null}});
            return true;
        },
        deleteCourse: async (_:unknown, args: {id:string}, ctx: Context): Promise<boolean> => {
            const myCourse = await ctx.CoursesCollection.findOneAndDelete({_id:new ObjectId(args.id)});
            if(!myCourse){return false;}
            await ctx.TeachersCollection.updateMany({coursesTaught:new ObjectId(args.id)},{$pull:{coursesTaught:new ObjectId(args.id)}})
            await ctx.StudentsCollection.updateMany({enrolledCourses:new ObjectId(args.id)},{$pull:{enrolledCourses:new ObjectId(args.id)}})
            return true;
        },
        updateStudent: async (_:unknown, args: {id: string, name?: string, email?: string}, ctx: Context): Promise<studentModel|null> => {
            await ctx.StudentsCollection.updateOne({_id: new ObjectId(args.id)},
                { $set: { ...(args.name && { name: args.name }), ...(args.email && { email: args.email })}})
            const studentDB = await ctx.StudentsCollection.findOne({_id: new ObjectId(args.id)}); 
            if(!studentDB) { return null; }
            return studentDB;
        },
        updateTeacher: async (_:unknown,args:{id: string, name?: string, email?: string}, ctx: Context): Promise<teacherModel|null> => {
            await ctx.TeachersCollection.updateOne({_id:new ObjectId(args.id)},
            { $set: { ...(args.name && { name: args.name }), ...(args.email && { email: args.email })}})
            const teacherDB = await ctx.TeachersCollection.findOne({_id:new ObjectId(args.id)});
            if(!teacherDB) { return null; }
            return teacherDB;
        },
        updateCourse: async (_: unknown, args: { id: string; title?: string; description?: string; teacherId?: string }, ctx: Context): Promise<courseModel|null> => {
            await ctx.CoursesCollection.updateOne(
                { _id: new ObjectId(args.id) },
                {$set: {...(args.title && { title: args.title }),
                        ...(args.description && { description: args.description }),
                        ...(args.teacherId && { teacherId: new ObjectId(args.teacherId) })}});      
            const myCourse = await ctx.CoursesCollection.findOne({_id: new ObjectId(args.id)});
            if (!myCourse) { return null; }
            return myCourse;
        },
        enrollStudentInCourse: async (_:unknown, args:{studentId: string, courseId: string}, ctx: Context): Promise<courseModel|null> => {
            const myStudent = await ctx.StudentsCollection.findOne({_id:new ObjectId(args.studentId)})
            const myCourse = await ctx.CoursesCollection.findOne({_id:new ObjectId(args.courseId)});
            if(!myStudent || !myCourse){ return null; }

            const student = myCourse.studentIds
            const exist = student.some((u) => myStudent._id === u)
            if(exist){ return myCourse}

            await ctx.StudentsCollection.updateOne({_id: new ObjectId(args.studentId)},{$push: {enrolledCourses: new ObjectId(args.courseId)}})
            await ctx.CoursesCollection.updateOne({_id: new ObjectId(args.courseId)},{$push: {studentIds: new ObjectId(args.studentId)}})
            const course = await ctx.CoursesCollection.findOne({_id: new ObjectId(args.courseId)})
            return course;
        },
        removeStudentFromCourse:async(_:unknown, args:{studentId: string, courseId: string}, ctx: Context): Promise<courseModel|null> => {
            const myStudent = await ctx.StudentsCollection.findOne({_id:new ObjectId(args.studentId)})
            const myCourse = await ctx.CoursesCollection.findOne({_id:new ObjectId(args.courseId)});
            if(!myStudent || !myCourse){ return null; }

            await ctx.CoursesCollection.updateOne({_id: new ObjectId(args.courseId) },{$pull: { enrolledStudents: new ObjectId(args.studentId)}});  
            await ctx.StudentsCollection.updateOne({_id: new ObjectId(args.studentId) },{$pull: {enrolledCourses: new ObjectId(args.courseId)}});
            const course = await ctx.CoursesCollection.findOne({_id:new ObjectId(args.courseId)});
            return course;
        },
    },
    Student: {
        id: (parent: studentModel): string => parent._id!.toString(),
        enrolledCourses: async (parent: studentModel, _: unknown, ctx: Context): Promise<courseModel[]> => {
            const enrolledCourses = await ctx.CoursesCollection.find({_id:{$in:parent.enrolledCourses}}).toArray();
            return enrolledCourses;
        }
    },
    Teacher: {
        id: (parent: teacherModel): string => parent._id!.toString(),
        coursesTaught: async (parent: teacherModel, _: unknown, ctx: Context): Promise<courseModel[]> => {
            const enrolledCourses = await ctx.CoursesCollection.find({_id:{$in:parent.coursesTaught}}).toArray();
            return enrolledCourses;
        }
    },
    Course: {
        id: (parent: courseModel): string => parent._id!.toString(),
        teacherId: async (parent: courseModel,  _: unknown, ctx: Context): Promise<teacherModel|null> => {
            if(parent.teacherId === null){ return null; }
            const teacher = await ctx.TeachersCollection.findOne({_id:parent.teacherId});
            return teacher;
        },
        studentIds: async (parent: courseModel,  _: unknown, ctx: Context): Promise<studentModel[]> => {
            const studentIds = await ctx.StudentsCollection.find({_id:{$in:parent.studentIds}}).toArray();
            return studentIds;
        }
    }
}