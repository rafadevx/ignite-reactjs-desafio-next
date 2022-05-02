import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { useEffect, useState } from 'react';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();
  const words = post.data.content.reduce((acc, curr) => {
    return (
      acc +
      curr.heading.split(' ').length +
      RichText.asText(curr.body).replaceAll(/(\n)+/g, ' ').split(' ').length
    );
  }, 0);

  const readingTime = Math.ceil(words / 200);
  const dateFormated = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  return (
    <main className={styles.container}>
      <img src={post.data.banner.url} alt="banner" />
      <article className={styles.post}>
        <h1>{post.data.title}</h1>
        <ul className={styles.info}>
          <li>
            <FiCalendar />
            {dateFormated}
          </li>
          <li>
            <FiUser />
            {post.data.author}
          </li>
          <li>
            <FiClock />
            {readingTime} min
          </li>
        </ul>
        {post.data.content.map(content => (
          <div key={content.heading}>
            <h2>{content.heading}</h2>
            <div
              className={styles.postContent}
              dangerouslySetInnerHTML={{
                __html: RichText.asHtml(content.body),
              }}
            />
          </div>
        ))}
      </article>
    </main>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient({});
  const posts = await prismic.getByType('post', { pageSize: 2 });

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prismic = getPrismicClient({});
  const { slug } = params;
  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: content.body,
        };
      }),
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30,
  };
};
