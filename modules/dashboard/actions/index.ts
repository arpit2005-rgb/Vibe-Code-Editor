"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/actions";
import { revalidatePath } from "next/cache";

export const toggleStarMarked = async (
  playgroundId: string,
  isChecked: boolean,
) => {
  const user = await getCurrentUser();
  const userId = user?.id;
  if (!userId) {
    throw new Error("User not found");
  }

  try {
    if (isChecked) {
      await db.starMark.create({
        data: {
          userId: userId,
          playgroundId: playgroundId,
          isMarked: isChecked,
        },
      });
    } else {
      await db.starMark.delete({
        where: {
          userId_playgroundId: {
            userId: userId,
            playgroundId: playgroundId,
          },
        },
      });
    }
    revalidatePath("/dashboard");
    return { success: true, isMarked: isChecked };
  } catch (error) {
    console.log(error);
    return { success: false, error };
  }
};

export const getAllPlaygroundForUser = async () => {
  const user = await getCurrentUser();
  try {
    const playgrounds = await db.playground.findMany({
      where: {
        userId: user?.id,
      },
      include: {
        user: true,
        Starmark: {
          where: {
            userId: user?.id,
          },
          select: {
            isMarked: true,
          },
        },
      },
    });
    return playgrounds;
  } catch (error) {
    console.log(error);
  }
};

export const createPlayground = async (data: {
  title: string;
  template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
  description?: string;
}) => {
  const user = await getCurrentUser();
  const { title, template, description } = data;
  try {
    const playground = await db.playground.create({
      data: {
        title: title,
        template: template,
        description: description!,
        userId: user?.id!,
      },
    });
    return playground;
  } catch (error) {
    console.log(error);
  }
};

export const deleteProjectById = async (id: string) => {
  try {
    await db.playground.delete({
      where: {
        id: id,
      },
    });
    revalidatePath("/dashboard");
  } catch (error) {
    console.log(error);
  }
};

export const editProjectById = async (
  id: string,
  data: { title: string; description: string },
) => {
  try {
    await db.playground.update({
      where: {
        id: id,
      },
      data: {
        title: data.title,
        description: data.description,
      },
    });
    revalidatePath("/dashboard");
  } catch (error) {
    console.log(error);
  }
};

export const duplicateProjectById = async (id: string) => {
  try {
    const originalPlayground = await db.playground.findUnique({
      where: {
        id: id,
        // todo: add template files
      },
    });
    if (!originalPlayground) {
      throw new Error("Original playground not found");
    }

    const duplicatedPlayground = await db.playground.create({
      data: {
        title: `${originalPlayground.title} (Copy)`,
        template: originalPlayground.template,
        description: originalPlayground.description,
        userId: originalPlayground.userId,
        // todo: add template files
      },
    });
    revalidatePath("/dashboard");
    return duplicatedPlayground;
  } catch (error) {
    console.log(error);
  }
};
