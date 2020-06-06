//
//  SearchScreen.swift
//  feedless
//
//  Created by Rogerio Chaves on 24/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct SearchScreen : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var router : Router
    @EnvironmentObject var search : Search
    @EnvironmentObject var imageLoader : ImageLoader
    @State private var query = ""

    init() {
        UITableView.appearance().tableHeaderView = UIView()
    }

    func peopleResults(_ results : [PeopleResult]) -> some View {
        return Section {
            Text("People").font(.headline)
            if results.count > 0 {
                ForEach(results, id: \.author) { result in
                    NavigationLink(destination: ProfileScreen(id: result.author)) {
                        HStack {
                            AsyncImage(url: Utils.avatarUrl(profile: result.authorProfile), imageLoader: self.imageLoader)
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 32, height: 32)
                                .border(Styles.darkGray)
                            Text(result.authorProfile.name ?? "unknown")
                        }
                    }
                }
            } else {
                Text("No results found")
            }
        }
    }

    func communitiesResults(_ results : [String]) -> some View {
        return Section {
            Text("Communities").font(.headline)
            if results.count > 0 {
                ForEach(results, id: \.self) { community in
                    NavigationLink(destination: CommunitiesShow(name: community)) {
                        HStack {
                            Text("#\(community)")
                        }
                    }
                }
            } else {
                Text("No results found")
            }
        }
    }

    var resultsLists : some View {
        switch search.results {
        case .notAsked:
            return AnyView(
                Spacer()
            )
        case .loading:
            return AnyView(Group {
                Spacer()
                Text("Loading...")
                Spacer()
            })
        case let .success(results):
            return AnyView(
                List {
                    peopleResults(results.people)
                    communitiesResults(results.communities)
                }
            )
        case let .error(message):
            return AnyView(Group {
                Spacer()
                Text(message)
                Spacer()
            })
        }
    }

    // From: https://stackoverflow.com/a/58473985/996404
    var searchField : some View {
        HStack {
            HStack {
                Image(systemName: "magnifyingglass")

                TextField("search", text: $query, onCommit: {
                    self.search.load(context: self.context, query: self.query)
                })
                    .foregroundColor(.primary)
                    .keyboardType(.webSearch)

                Button(action: {
                    self.query = ""
                }) {
                    Image(systemName: "xmark.circle.fill").opacity(query == "" ? 0 : 1)
                }
            }
            .padding(EdgeInsets(top: 8, leading: 6, bottom: 8, trailing: 6))
            .foregroundColor(.secondary)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(10.0)
        }.padding(.horizontal)
    }

    var body: some View {
        UITableView.appearance().backgroundColor = Styles.uiWhite

        return VStack {
            searchField
            resultsLists
        }
        .navigationBarTitle(Text("Search"))
        .onAppear {
            self.router.updateNavigationBarColor(route: .search)
        }
    }
}

struct SearchScreen_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            SearchScreen()
                .environmentObject(Samples.context())
                .environmentObject(Samples.search())
//                .environmentObject(Search())
                .environmentObject(ImageLoader())
        }
    }
}
